// Performance optimizations for Task Manager

// Lazy loading for images
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Virtual scrolling for large task lists
class VirtualScroller {
    constructor(container, itemHeight = 100) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.visibleItems = Math.ceil(window.innerHeight / itemHeight) + 2;
        this.scrollTop = 0;
        this.items = [];
        
        this.init();
    }
    
    init() {
        this.container.addEventListener('scroll', throttle(() => {
            this.scrollTop = this.container.scrollTop;
            this.render();
        }, 16));
        
        window.addEventListener('resize', debounce(() => {
            this.visibleItems = Math.ceil(window.innerHeight / this.itemHeight) + 2;
            this.render();
        }, 250));
    }
    
    setItems(items) {
        this.items = items;
        this.render();
    }
    
    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleItems, this.items.length);
        
        // Clear container
        this.container.innerHTML = '';
        
        // Add spacer for items above viewport
        if (startIndex > 0) {
            const spacer = document.createElement('div');
            spacer.style.height = `${startIndex * this.itemHeight}px`;
            this.container.appendChild(spacer);
        }
        
        // Render visible items
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.items[i];
            if (item) {
                this.container.appendChild(item);
            }
        }
        
        // Add spacer for items below viewport
        const remainingItems = this.items.length - endIndex;
        if (remainingItems > 0) {
            const spacer = document.createElement('div');
            spacer.style.height = `${remainingItems * this.itemHeight}px`;
            this.container.appendChild(spacer);
        }
    }
}

// Memory management
class MemoryManager {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 100;
    }
    
    set(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    
    get(key) {
        return this.cache.get(key);
    }
    
    clear() {
        this.cache.clear();
    }
    
    cleanup() {
        // Remove unused DOM elements
        const unusedElements = document.querySelectorAll('[data-unused="true"]');
        unusedElements.forEach(el => el.remove());
        
        // Clear cache if memory usage is high
        if (performance.memory && performance.memory.usedJSHeapSize > 50 * 1024 * 1024) {
            this.clear();
        }
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            taskRenderTime: [],
            searchTime: [],
            dragTime: []
        };
    }
    
    startMeasure(name) {
        performance.mark(`${name}-start`);
    }
    
    endMeasure(name) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name)[0];
        if (this.metrics[name]) {
            this.metrics[name].push(measure.duration);
            
            // Keep only last 100 measurements
            if (this.metrics[name].length > 100) {
                this.metrics[name].shift();
            }
        }
        
        // Clean up marks and measures
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
    }
    
    getAverageTime(metric) {
        const times = this.metrics[metric];
        if (!times || times.length === 0) return 0;
        
        const sum = times.reduce((a, b) => a + b, 0);
        return sum / times.length;
    }
    
    logPerformance() {
        console.group('Performance Metrics');
        Object.keys(this.metrics).forEach(metric => {
            const avg = this.getAverageTime(metric);
            console.log(`${metric}: ${avg.toFixed(2)}ms average`);
        });
        console.groupEnd();
    }
}

// Initialize performance optimizations
const memoryManager = new MemoryManager();
const performanceMonitor = new PerformanceMonitor();

// Cleanup interval
setInterval(() => {
    memoryManager.cleanup();
}, 60000); // Every minute

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        lazyLoadImages,
        debounce,
        throttle,
        VirtualScroller,
        MemoryManager,
        PerformanceMonitor,
        memoryManager,
        performanceMonitor
    };
} else {
    window.PerformanceUtils = {
        lazyLoadImages,
        debounce,
        throttle,
        VirtualScroller,
        MemoryManager,
        PerformanceMonitor,
        memoryManager,
        performanceMonitor
    };
}