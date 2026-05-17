/* Fondasi Documentation - Navigation & Initialization */

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.docs-nav-link');
    const sections = document.querySelectorAll('.docs-section');

    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = link.getAttribute('data-section');

            navLinks.forEach(function(l) {
                l.classList.remove('active');
            });
            link.classList.add('active');

            sections.forEach(function(s) {
                s.classList.remove('active');
            });
            document.getElementById(target).classList.add('active');
        });
    });

    // Initialize Fondasi components
    if (typeof Fondasi !== 'undefined' && Fondasi.initComponents) {
        Fondasi.initComponents();
    } else if (typeof initComponents === 'function') {
        initComponents();
    }

    // Fallback: manually initialize tabs using Fondasi.Tabs
    if (typeof Fondasi !== 'undefined' && Fondasi.Tabs) {
        document.querySelectorAll('.tabs').forEach(function(el) {
            if (!el._nusaInit) {
                new Fondasi.Tabs(el);
                el._nusaInit = true;
            }
        });
    }

    // Toast Demo functionality
    initToastDemo();

    // Copy code functionality
    initCopyCode();
});

function initToastDemo() {
    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        danger: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    let toastCount = 0;

    function createToastContainer() {
        let container = document.getElementById('demo-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'demo-toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function createToast(message, type) {
        const container = createToastContainer();
        const id = 'toast-' + (++toastCount);

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.id = id;
        toast.innerHTML = `
            <div class="toast-icon-wrapper">
                ${icons[type] || icons.info}
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="removeToast('${id}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            removeToast(id);
        }, 4000);

        return toast;
    }

    window.removeToast = function(id) {
        const toast = document.getElementById(id);
        if (toast) {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                toast.remove();
            }, 200);
        }
    };

    window.demoToast = {
        show: function(message, type) {
            createToast(message, type || 'info');
        },
        showWithActions: function() {
            const container = createToastContainer();
            const id = 'toast-action-' + (++toastCount);

            const toast = document.createElement('div');
            toast.className = 'toast toast-info';
            toast.id = id;
            toast.innerHTML = `
                <div class="toast-icon-wrapper">
                    ${icons.info}
                </div>
                <div class="toast-content">
                    <div class="toast-title">Update Available</div>
                    <div class="toast-message">A new version is ready to install.</div>
                    <div class="toast-actions">
                        <button class="toast-action-btn toast-action-btn-primary" onclick="demoToast.onAction('install')">Install Now</button>
                        <button class="toast-action-btn toast-action-btn-secondary" onclick="demoToast.onAction('later')">Later</button>
                    </div>
                </div>
                <button class="toast-close" onclick="removeToast('${id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;

            container.appendChild(toast);

            setTimeout(() => {
                removeToast(id);
            }, 6000);
        },
        onAction: function(action) {
            console.log('Action clicked:', action);
            demoToast.show(`Action "${action}" was selected!`, 'success');
        }
    };
}

// Add toast progress animation
const style = document.createElement('style');
style.textContent = `
    @keyframes toastProgress {
        from { width: 100%; }
        to { width: 0%; }
    }
`;
document.head.appendChild(style);

// Copy Code Functionality
function initCopyCode() {
    const copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    // Fallback copy function
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        // Fallback for older browsers
        return new Promise(function(resolve, reject) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                resolve();
            } catch (err) {
                reject(err);
            }
            document.body.removeChild(textarea);
        });
    }

    document.querySelectorAll('pre').forEach(function(pre) {
        if (pre.querySelector('.code-copy-btn')) return;

        const code = pre.querySelector('code');
        if (!code) return;

        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.innerHTML = copyIcon;
        btn.type = 'button';
        btn.title = 'Copy code';

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const text = code.textContent;
            copyToClipboard(text).then(function() {
                btn.innerHTML = checkIcon;
                btn.classList.add('copied');
                btn.title = 'Copied!';
                setTimeout(function() {
                    btn.innerHTML = copyIcon;
                    btn.classList.remove('copied');
                    btn.title = 'Copy code';
                }, 2000);
            }).catch(function(err) {
                console.error('Failed to copy:', err);
            });
        });

        pre.style.position = 'relative';
        pre.appendChild(btn);
    });
}