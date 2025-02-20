import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const NodeCard = ({ nodeId, action }) => {
  return (
    <Html
      position={[0, 1, 0]}
      style={{
        pointerEvents: 'none',
      }}
    >
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        transform: 'scale(1)',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}>
        <div style={{ color: '#64ffda', marginBottom: '4px' }}>Node Operator #{nodeId}</div>
        <div style={{ color: '#fff' }}>{action}</div>
      </div>
    </Html>
  )
}

const Node = ({ position, scale = 1, index, showCard }) => {
  const meshRef = useRef()
  const [action] = useState(getRandomAction()) // Keep same action while card is shown
  
  useFrame((state) => {
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[scale, scale, scale]} />
      <meshPhongMaterial 
        color={showCard ? "#64ffda" : "#ffffff"} 
        opacity={0.7} 
        transparent 
      />
      {showCard && (
        <NodeCard 
          nodeId={index + 1}
          action={action}
        />
      )}
    </mesh>
  )
}

const Connection = ({ start, end }) => {
  const lineRef = useRef()
  const materialRef = useRef()

  const points = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)
    const midPoint = new THREE.Vector3().lerpVectors(startVec, endVec, 0.5)
    midPoint.y += 0.5 // Reduced curve height
    
    const curve = new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec)
    return curve.getPoints(50)
  }, [start, end])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.dashOffset -= 0.01
    }
  })

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        points.flatMap(p => [p.x, p.y, p.z]),
        3
      )
    )
    return geom
  }, [points])

  return (
    <group>
      {/* Solid line underneath */}
      <line geometry={geometry}>
        <lineBasicMaterial
          color="#8a8a8a"
          opacity={0.3}
          transparent
          linewidth={1}
        />
      </line>
      {/* Animated dashed line on top */}
      <line ref={lineRef} geometry={geometry}>
        <lineDashedMaterial
          ref={materialRef}
          color="#ffffff"
          dashSize={0.2}
          gapSize={0.2}
          opacity={0.6}
          transparent
          linewidth={1}
        />
      </line>
    </group>
  )
}

const ACTIONS = [
  'Verifying Randomness',
  'Generating Entropy',
  'Broadcasting Commitment',
  'Revealing Secret',
  'Validating Proof',
  'Computing Hash',
  'Aggregating Shares',
  'Distributing Beacon',
  'Signing Block',
  'Updating State'
]

function getRandomAction() {
  return ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
}

export function Scene() {
  const [activeNodeIndex, setActiveNodeIndex] = useState(null)

  useEffect(() => {
    // Show first card immediately
    setActiveNodeIndex(Math.floor(Math.random() * 12))

    // Then continue with interval
    const interval = setInterval(() => {
      setActiveNodeIndex(prev => {
        let next
        do {
          next = Math.floor(Math.random() * 12)
        } while (next === prev)
        return next
      })
    }, 3000) // Change card every 3 seconds

    return () => clearInterval(interval)
  }, [])
  const nodes = useMemo(() => {
    const positions = []
    const radius = 4 // Reduced radius for closer nodes
    const heightVariation = 1.5 // Reduced height variation
    
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const x = Math.cos(angle) * radius * (0.8 + Math.random() * 0.4)
      const z = Math.sin(angle) * radius * (0.8 + Math.random() * 0.4)
      const y = (Math.random() - 0.5) * heightVariation
      
      positions.push([x, y, z])
    }
    return positions
  }, [])

  const connections = useMemo(() => {
    const conns = []
    for (let i = 0; i < nodes.length; i++) {
      // Connect to next 2-3 nodes in sequence for more organized connections
      const numConnections = 2 + Math.floor(Math.random())
      for (let j = 1; j <= numConnections; j++) {
        const target = (i + j) % nodes.length
        conns.push([i, target])
      }
    }
    return conns
  }, [nodes])

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Grid */}
      <gridHelper
        args={[20, 20, "#8a8a8a", "#8a8a8a"]}
        position={[0, -1, 0]}
        rotation={[0, 0, 0]} // Grid is now perfectly horizontal
      />
      
      {/* Nodes */}
      {nodes.map((pos, i) => (
        <Node 
          key={i} 
          position={pos} 
          scale={0.4} 
          index={i}
          showCard={i === activeNodeIndex}
        />
      ))}
      
      {/* Connections */}
      {connections.map(([from, to], i) => (
        <Connection
          key={i}
          start={nodes[from]}
          end={nodes[to]}
        />
      ))}

      {/* Adjusted fog for better depth perception */}
      <fog attach="fog" args={["#000000", 5, 50]} />
    </>
  )
}
