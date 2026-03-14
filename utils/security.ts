import { Platform } from 'react-native';

/**
 * Initializes anti-inspect and security measures for the application.
 * Primarily targets the Web platform to prevent debugging, right-clicking,
 * and common developer tool keyboard shortcuts.
 */
export const initSecurity = () => {
    if (Platform.OS !== 'web') return;

    // 1. Disable Right-Click (Context Menu)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // 2. Disable Common Developer Tool Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
        }
        // Ctrl+Shift+I / Cmd+Option+I (Inspect)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
            e.preventDefault();
        }
        // Ctrl+Shift+J / Cmd+Option+J (Console)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
            e.preventDefault();
        }
        // Ctrl+Shift+C / Cmd+Option+C (Element Selector)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
        }
        // Ctrl+U / Cmd+U (View Source)
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
        }
        // Ctrl+S / Cmd+S (Save Page)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
        }
    });

    // 3. Debugger Trap
    // This creates an infinite loop that triggers the debugger whenever DevTools is opened.
    setInterval(() => {
        (function() {
            (function a() {
                try {
                    (function b(i) {
                        if (('' + (i / i)).length !== 1 || i % 20 === 0) {
                            (function() {}).constructor('debugger')();
                        } else {
                            debugger;
                        }
                        b(++i);
                    })(0);
                } catch (e) {
                    setTimeout(a, 5);
                }
            })();
        })();
    }, 100);

    // 4. Console Clearing
    // Periodically clear the console to remove any logged data.
    setInterval(() => {
        console.clear();
    }, 1000);
    
    // 5. Detect DevTools and potentially crash or redirect (Aggressive)
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        // This is executed when DevTools is opened and tries to inspect the image
        window.location.reload(); 
      }
    });
    console.log(element);
};
