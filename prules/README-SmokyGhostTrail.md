# SmokyGhostTrail Library

A WebGL-based ghost cursor trail effect library that can be dynamically instantiated and rendered within any specified target DOM element.

## Features

- **Modular Structure**: Self-contained JavaScript library that can be imported or included independently
- **Dynamic Targeting**: Accept a target element selector or DOM element as a parameter
- **Configurable Options**: Customize trail parameters (length, colors, animation speed, particle count, etc.)
- **Instance Management**: Support multiple instances running simultaneously on different elements without conflicts
- **Clean API**: Clear methods for initialization, starting/stopping the effect, and cleanup/destruction
- **Error Handling**: Proper error handling for invalid target elements or configuration options

## Installation

### Direct Include
```html
<script src="ghost-trail.js"></script>
```

### ES6 Module
```javascript
import SmokyGhostTrail from './ghost-trail.js';
```

### CommonJS
```javascript
const SmokyGhostTrail = require('./ghost-trail.js');
```

## Basic Usage

```javascript
// Create a new ghost trail instance
const ghostTrail = new SmokyGhostTrail('#my-element', {
    size: 0.1,
    tail: {
        dotsNumber: 25,
        spring: 1.4,
        friction: 0.3,
        gravity: 0
    },
    mainColor: [0.98, 0.96, 0.96],
    borderColor: [0.2, 0.5, 0.7]
});

// Start the effect
ghostTrail.start();

// Stop the effect
ghostTrail.stop();

// Clean up resources
ghostTrail.destroy();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | Number | `0.1` | Size of the ghost trail effect |
| `tail.dotsNumber` | Number | `25` | Number of trail particles |
| `tail.spring` | Number | `1.4` | Spring force for trail physics |
| `tail.friction` | Number | `0.3` | Friction applied to trail movement |
| `tail.gravity` | Number | `0` | Gravity effect on trail particles |
| `smile` | Number | `1` | Ghost face expression (0-1) |
| `mainColor` | Array | `[0.98, 0.96, 0.96]` | RGB color values (0-1) for main ghost |
| `borderColor` | Array | `[0.2, 0.5, 0.7]` | RGB color values (0-1) for border |
| `isFlatColor` | Boolean | `false` | Whether to use flat coloring |
| `mouseThreshold` | Number | `0.1` | Mouse movement smoothing factor |
| `zIndex` | Number | `10000` | CSS z-index for the canvas |
| `pointerEvents` | String | `'none'` | CSS pointer-events property |

## API Methods

### Constructor
```javascript
new SmokyGhostTrail(target, options)
```
- `target`: CSS selector string or DOM element
- `options`: Configuration object (optional)

### Instance Methods

#### `start()`
Start the ghost trail effect.
```javascript
ghostTrail.start();
```

#### `stop()`
Stop the ghost trail effect (can be restarted).
```javascript
ghostTrail.stop();
```

#### `updateOptions(newOptions)`
Update configuration options dynamically.
```javascript
ghostTrail.updateOptions({
    size: 0.15,
    mainColor: [1.0, 0.5, 0.5]
});
```

#### `getOptions()`
Get current configuration options.
```javascript
const currentOptions = ghostTrail.getOptions();
```

#### `destroy()`
Destroy the instance and clean up all resources.
```javascript
ghostTrail.destroy();
```

#### `isActive()`
Check if the effect is currently running.
```javascript
const isRunning = ghostTrail.isActive();
```

## Multiple Instances

You can create multiple ghost trail instances on different elements:

```javascript
const trail1 = new SmokyGhostTrail('#element1', {
    mainColor: [1.0, 0.5, 0.5],
    size: 0.08
});

const trail2 = new SmokyGhostTrail('#element2', {
    mainColor: [0.5, 1.0, 0.5],
    size: 0.12
});

trail1.start();
trail2.start();
```

## Browser Support

- WebGL-enabled browsers
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers with WebGL support

## Error Handling

The library includes comprehensive error handling:

```javascript
try {
    const ghostTrail = new SmokyGhostTrail('#non-existent-element');
} catch (error) {
    console.error('Failed to create ghost trail:', error.message);
}
```

## Performance Considerations

- Uses WebGL for hardware acceleration
- Optimized for 60fps performance
- Automatically adjusts to device pixel ratio
- Efficient memory management with proper cleanup

## Examples

See `index.html` for a complete working example with multiple configurations and interactive controls.

## License

This library is provided as-is for educational and commercial use.
