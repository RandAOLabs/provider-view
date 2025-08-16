import React, { useState, useEffect } from 'react'
import { FiBookOpen, FiChevronDown, FiChevronUp, FiLoader } from 'react-icons/fi'
import { ConnectWallet } from '../../components/common/ConnectWallet'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import axios from 'axios'
import './InfoHow.css'

// Type for code component in ReactMarkdown
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Type for link component in ReactMarkdown
interface LinkProps {
  href?: string;
  children?: React.ReactNode;
}

// Type for FAQ item
interface FAQItem {
  question: string;
  answer: string;
}

export default function InfoHow() {
  // State for markdown content
  const [readme, setReadme] = useState<string>('')
  const [readmeWithoutFAQ, setReadmeWithoutFAQ] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  
  // State for FAQ items extracted from README
  const [faqItems, setFaqItems] = useState<FAQItem[]>([])
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [rawFAQSection, setRawFAQSection] = useState<string>('')

  // Toggle FAQ item expansion
  const toggleItem = (index: number) => {
    setExpandedItems(prevState => {
      if (prevState.includes(index)) {
        return prevState.filter(item => item !== index)
      } else {
        return [...prevState, index]
      }
    })
  }

  useEffect(() => {
    const fetchReadme = async () => {
      setLoading(true)
      try {
        // Fetch README from GitHub
        const response = await axios.get(
          'https://raw.githubusercontent.com/RandAOLabs/Randomness-Provider/main/README.md'
        )
        
        const content = response.data
        console.log('README content length:', content.length)
        console.log('README content preview (first 200 chars):', content.substring(0, 200) + '...')
        console.log('README content preview (last 200 chars):', '...' + content.substring(content.length - 200))
        
        // Check if content contains the FAQ section heading
        const hasFAQHeading = content.includes('## Frequently Asked Questions')
        console.log('Contains FAQ heading:', hasFAQHeading)
        
        if (hasFAQHeading) {
          const faqHeadingIndex = content.indexOf('## Frequently Asked Questions')
          console.log('FAQ heading index:', faqHeadingIndex)
          console.log('Content after heading (50 chars):', content.substring(faqHeadingIndex, faqHeadingIndex + 50))
        }
        
        setReadme(content)
        
        // Extract FAQ section from README
        extractFAQFromReadme(content)
        
        setError('')
      } catch (err) {
        console.error('Error fetching README:', err)
        setError('Failed to load documentation. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchReadme()
  }, [])
  
  // Extract FAQ items from the README using direct string manipulation
  const extractFAQFromReadme = (content: string) => {
    try {
      console.log('Begin extracting FAQs from README')
      
      // Add explicit check for FAQ heading
      const containsFAQHeading = content.includes('## Frequently Asked Questions')
      console.log('Contains "## Frequently Asked Questions" heading:', containsFAQHeading)
      
      // Extract directly from content to bypass potential regex issues
      const faqStart = content.indexOf('## Frequently Asked Questions')
      console.log('FAQ section starts at index:', faqStart)
      
      if (faqStart !== -1) {
        // The actual start of the section content is after the heading and any whitespace
        const contentAfterHeading = content.substring(faqStart)
        console.log('Content after heading starts with:', contentAfterHeading.substring(0, 50))
        
        // Find the end of the FAQ section (next ## heading or end of content)
        // We need to search for the next '##' that is at the beginning of a line
        // First, skip the current heading line
        const afterHeadingLine = contentAfterHeading.indexOf('\n')
        if (afterHeadingLine === -1) {
          console.log('No newline found after heading, section might be empty')
          return
        }
        
        const contentAfterFirstLine = contentAfterHeading.substring(afterHeadingLine + 1)
        console.log('Content after first line starts with:', contentAfterFirstLine.substring(0, 50))
        
        // Now search for the next heading (## at beginning of line)
        let faqEnd = -1
        const lines = contentAfterFirstLine.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.startsWith('##') && !line.startsWith('###')) {
            // Found next section heading
            faqEnd = contentAfterHeading.indexOf(line, afterHeadingLine)
            console.log(`Found next heading at line ${i+1}: "${line}"`)
            break
          }
        }
        
        // If no next heading found, use end of content
        if (faqEnd === -1) {
          faqEnd = contentAfterHeading.length
          console.log('No next heading found, using end of content')
        } else {
          console.log('Next heading found at offset', faqEnd, 'from FAQ start')
        }
        
        // Extract the FAQ section content including the heading
        const faqSectionRaw = contentAfterHeading.substring(0, faqEnd).trim()
        console.log('FAQ section raw length:', faqSectionRaw.length)
        console.log('FAQ section raw first 100 chars:', faqSectionRaw.substring(0, 100))
        if (faqSectionRaw.length > 100) {
          console.log('FAQ section raw last 100 chars:', faqSectionRaw.substring(faqSectionRaw.length - 100))
        }
        
        // Store the raw section for debugging display
        setRawFAQSection(faqSectionRaw)
        
        // Find the content after the heading (skip the first line)
        const firstLineBreak = faqSectionRaw.indexOf('\n')
        if (firstLineBreak === -1) {
          console.log('Warning: FAQ section has no content after the header')
          return
        }
        
        const faqContent = faqSectionRaw.substring(firstLineBreak + 1).trim()
        console.log('FAQ content length (after removing header):', faqContent.length)
        console.log('FAQ content first 100 chars:', faqContent.substring(0, 100))
        if (faqContent.length > 100) {
          console.log('FAQ content last 100 chars:', faqContent.substring(faqContent.length - 100))
        }
        
        // Create a version of the README without the FAQ section for the main display
        // Completely remove the FAQ section (including heading) from the main content
        // since we'll show it in a dedicated section below
        const contentWithoutFAQ = content.replace(faqSectionRaw, '')
        setReadmeWithoutFAQ(contentWithoutFAQ)
        
        // Check if there are any question headings
        const hasQuestionHeadings = faqContent.includes('### ')
        console.log('FAQ content contains question headings (### ):', hasQuestionHeadings)
        
        if (!hasQuestionHeadings) {
          console.log('No question headings found in FAQ section')
          setDebugInfo('No question headings (###) found in FAQ section')
          return
        }
        
        // Use a simpler, more direct approach to extract FAQ questions and answers
        const faqs: FAQItem[] = []
        
        // Split by ### to get each question section
        const faqParts = faqContent.split('### ')
        console.log('FAQ parts after splitting by ###:', faqParts.length)
        
        // Start from index 1 to skip the first split result (which is empty or contains just general text)
        for (let i = 1; i < faqParts.length; i++) {
          const part = faqParts[i].trim()
          console.log(`Part ${i} length:`, part.length)
          console.log(`Part ${i} preview:`, part.substring(0, 50))
          
          if (part) {
            // Find the first line break which separates the question from the answer
            const lineBreakIndex = part.indexOf('\n')
            
            if (lineBreakIndex !== -1) {
              const question = part.substring(0, lineBreakIndex).trim()
              const answer = part.substring(lineBreakIndex).trim()
              
              console.log(`Found FAQ ${i}:`, question)
              console.log(`Answer preview:`, answer.substring(0, 50))
              
              faqs.push({
                question,
                answer
              })
            } else {
              console.log(`Part ${i} has no line break, skipping`)
            }
          }
        }
        
        if (faqs.length > 0) {
          console.log(`Extracted ${faqs.length} FAQ items`)
          setFaqItems(faqs)
          setDebugInfo(`Found FAQ section with ${faqs.length} items`)
        } else {
          const debugMessage = `FAQ section found but no items could be parsed. Section length: ${faqContent.length}`
          console.log(debugMessage)
          setDebugInfo(debugMessage)
          // No fallback as per user request
        }
      } else {
        const debugMessage = 'No FAQ section found in README'
        console.log(debugMessage)
        setDebugInfo(debugMessage)
        setReadmeWithoutFAQ(content)
        // No fallback as per user request
      }
    } catch (error) {
      console.error('Error extracting FAQs:', error)
      setReadmeWithoutFAQ(content)
      setDebugInfo(`Error extracting FAQs: ${String(error)}`)
      // No fallback as per user request
    }
  }
  
  // Custom link handler for internal navigation
  const CustomLink = ({ href, children }: LinkProps) => {
    // Handle internal links (starting with #)
    if (href && href.startsWith('#')) {
      return (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault()
            const targetId = href.slice(1) // Remove the # character
            const targetElement = document.getElementById(targetId)
            
            if (targetElement) {
              // Smooth scroll to the element
              targetElement.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        >
          {children}
        </a>
      )
    }
    
    // For external links, open in new tab
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }

  return (
    <div className="info-how-page">
      <ConnectWallet />
      <main>
        <section className="readme-section">
          <h1>Node Provider Setup Guide</h1>
          
          {loading ? (
            <div className="loading-container">
              <FiLoader className="loading-spinner" />
              <p>Loading documentation...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <p>Please check your connection and try refreshing the page.</p>
            </div>
          ) : (
            <div className="markdown-container">
              <ReactMarkdown 
                children={readmeWithoutFAQ || readme} 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <CustomLink href={href}>{children}</CustomLink>
                  ),
                  pre: ({node, ...props}) => (
                    <pre className="code-block" {...props} />
                  ),
                  code: ({node, inline, className, children, ...props}: CodeProps) => (
                    inline 
                      ? <code className={`inline-code ${className || ''}`} {...props}>{children}</code>
                      : <code className={className || ''} {...props}>{children}</code>
                  ),
                  // Add IDs to headings for anchor links
                  h1: ({node, ...props}) => <h1 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props} />,
                  h2: ({node, ...props}) => <h2 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props} />,
                  h3: ({node, ...props}) => <h3 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props} />
                }}
              />
            </div>
          )}
        </section>

        {/* Always show FAQ section, with appropriate content based on state */}
        <section className="faq-section" id="frequently-asked-questions">
          <div className="faq-header">
            <h2><FiBookOpen className="faq-icon" /> Frequently Asked Questions</h2>
            <p className="faq-note">Click on a question to view the answer</p>
          </div>
          
          {loading ? (
            <div className="loading-container">
              <FiLoader className="loading-spinner" />
              <p>Loading FAQ items...</p>
            </div>
          ) : faqItems.length > 0 ? (
            <div className="faq-container">
              {faqItems.map((item, index) => (
                <details key={index} className="faq-item" open={expandedItems.includes(index)}>
                  <summary 
                    className="faq-question" 
                    onClick={(e) => {
                      // Prevent default to handle the toggle ourselves
                      e.preventDefault();
                      toggleItem(index);
                    }}
                  >
                    <h3>{item.question}</h3>
                    <div className="faq-icon">
                      {expandedItems.includes(index) ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </summary>
                  <div className="faq-answer">
                    <ReactMarkdown 
                      children={item.answer} 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <CustomLink href={href}>{children}</CustomLink>
                        ),
                        code: ({node, inline, className, children, ...props}: CodeProps) => (
                          inline 
                            ? <code className={`inline-code ${className || ''}`} {...props}>{children}</code>
                            : <code className={className || ''} {...props}>{children}</code>
                        )
                      }}
                    />
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="no-faq-message">
              <p>No FAQ items found in the documentation.</p>
              <div className="debug-info">
                <p><strong>Debug Info:</strong> {debugInfo}</p>
                {rawFAQSection && (
                  <details className="debug-details">
                    <summary>Raw FAQ Section Content</summary>
                    <pre className="debug-content">
                      {rawFAQSection}
                    </pre>
                  </details>
                )}
                {readme && (
                  <details className="debug-details">
                    <summary>README Content Preview</summary>
                    <pre className="debug-content">
                      {readme.length > 1000 
                        ? readme.substring(0, 500) + '\n\n...\n\n' + readme.substring(readme.length - 500) 
                        : readme}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
