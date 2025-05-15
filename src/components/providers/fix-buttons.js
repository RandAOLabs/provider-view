// Script to find and replace both buttons in the component
// First button (when there are no requests)
const buttonFix1 = `        <div className="refresh-container">
          <button
            className={\`refresh-button\${isLoading ? ' loading' : ''}\${autoRefreshEnabled ? ' auto-on' : ''}\`}
            onClick={() => {
              // Toggle auto-refresh when manually clicked
              const newState = !autoRefreshEnabled;
              setAutoRefreshEnabled(newState);
              
              if (newState && !isLoading) {
                // If turning on and not currently loading, start refresh cycle
                refreshData();
              } else if (!newState) {
                // If turning off, clear any scheduled refreshes
                clearRefreshTimer();
              }
            }}
            disabled={isLoading}
            title={autoRefreshEnabled ? "Auto-refreshing (click to stop)" : "Click to start auto-refresh"}
          >
            {isLoading ? (
              <FiLoader className="icon-spin" />
            ) : (
              <FiRefreshCw className={\`refresh-icon\${autoRefreshEnabled ? ' auto-refreshing' : ''}\`} />
            )}
          </button>
        </div>`;

// Second button (when there are requests)
const buttonFix2 = `      <div className="refresh-container">
        <button
          className={\`refresh-button\${isLoading ? ' loading' : ''}\${autoRefreshEnabled ? ' auto-on' : ''}\`}
          onClick={() => {
            // Toggle auto-refresh when manually clicked
            const newState = !autoRefreshEnabled;
            setAutoRefreshEnabled(newState);
            
            if (newState && !isLoading) {
              // If turning on and not currently loading, start refresh cycle
              refreshData();
            } else if (!newState) {
              // If turning off, clear any scheduled refreshes
              clearRefreshTimer();
            }
          }}
          disabled={isLoading}
          title={autoRefreshEnabled ? "Auto-refreshing (click to stop)" : "Click to start auto-refresh"}
        >
          {isLoading ? (
            <FiLoader className="icon-spin" />
          ) : (
            <FiRefreshCw className={\`refresh-icon\${autoRefreshEnabled ? ' auto-refreshing' : ''}\`} />
          )}
        </button>
      </div>`;

console.log('Code for button fix 1:');
console.log(buttonFix1);
console.log('Code for button fix 2:');
console.log(buttonFix2);
