/**
 * SmokyGhostTrail - A WebGL-based ghost cursor trail effect library
 *
 * Usage:
 * const ghostTrail = new SmokyGhostTrail(targetElement, options);
 * ghostTrail.start();
 */

class SmokyGhostTrail {
    constructor(target, options = {}) {
        // Validate target element
        this.targetElement = this._validateTarget(target);
        if (!this.targetElement) {
            throw new Error('Invalid target element provided');
        }

        // Default configuration
        this.defaultOptions = {
            size: 0.1,
            tail: {
                dotsNumber: 25,
                spring: 1.4,
                friction: 0.3,
                gravity: 0,
            },
            smile: 1,
            mainColor: [0.98, 0.96, 0.96],
            borderColor: [0.2, 0.5, 0.7],
            isFlatColor: false,
            mouseThreshold: 0.1,
            zIndex: 10000,
            pointerEvents: 'none'
        };

        // Merge options with defaults
        this.options = this._mergeOptions(this.defaultOptions, options);

        // Internal state
        this.isRunning = false;
        this.animationId = null;
        this.canvas = null;
        this.gl = null;
        this.uniforms = null;
        this.textureCanvas = null;
        this.textureCtx = null;
        this.pointerTrail = [];
        this.mouse = {
            x: 0,
            y: 0,
            tX: 0,
            tY: 0,
            moving: false,
            controlsPadding: 0
        };
        this.movingTimer = null;
        this.devicePixelRatio = Math.min(window.devicePixelRatio, 2);

        // Bind methods
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);
        this._handleClick = this._handleClick.bind(this);
        this._handleResize = this._handleResize.bind(this);
        this._render = this._render.bind(this);

        // Initialize
        this._init();
    }

    /**
     * Validate and normalize target element
     */
    _validateTarget(target) {
        if (typeof target === 'string') {
            const element = document.querySelector(target);
            if (!element) {
                console.error(`Element with selector "${target}" not found`);
                return null;
            }
            return element;
        } else if (target instanceof HTMLElement) {
            return target;
        } else {
            console.error('Target must be a valid DOM element or CSS selector string');
            return null;
        }
    }

    /**
     * Deep merge options with defaults
     */
    _mergeOptions(defaults, options) {
        const result = { ...defaults };

        for (const key in options) {
            if (options.hasOwnProperty(key)) {
                if (typeof options[key] === 'object' && options[key] !== null && !Array.isArray(options[key])) {
                    result[key] = this._mergeOptions(defaults[key] || {}, options[key]);
                } else {
                    result[key] = options[key];
                }
            }
        }

        return result;
    }

    /**
     * Initialize the ghost trail effect
     */
    _init() {
        try {
            this._createCanvas();
            this._createTextureCanvas();
            this._initPointerTrail();
            this._initWebGL();
            this._setupEventListeners();
            this._updateMousePosition(
                this.targetElement.offsetWidth * 0.25,
                this.targetElement.offsetHeight * 0.8
            );
        } catch (error) {
            console.error('Failed to initialize SmokyGhostTrail:', error);
            throw error;
        }
    }

    /**
     * Create and setup the main canvas
     */
    _createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = this.options.zIndex;
        this.canvas.style.pointerEvents = this.options.pointerEvents;

        // Ensure target element has relative positioning
        const targetStyle = window.getComputedStyle(this.targetElement);
        if (targetStyle.position === 'static') {
            this.targetElement.style.position = 'relative';
        }

        this.targetElement.appendChild(this.canvas);
    }

    /**
     * Create texture canvas for trail rendering
     */
    _createTextureCanvas() {
        this.textureCanvas = document.createElement('canvas');
        this.textureCtx = this.textureCanvas.getContext('2d');
    }

    /**
     * Initialize pointer trail array
     */
    _initPointerTrail() {
        this.pointerTrail = new Array(this.options.tail.dotsNumber);
        const dotSize = (i) => this.options.size * this._getContainerHeight() *
            (1 - 0.2 * Math.pow(3 * i / this.options.tail.dotsNumber - 1, 2));

        for (let i = 0; i < this.options.tail.dotsNumber; i++) {
            this.pointerTrail[i] = {
                x: this.mouse.x,
                y: this.mouse.y,
                vx: 0,
                vy: 0,
                opacity: 0.04 + 0.3 * Math.pow(1 - i / this.options.tail.dotsNumber, 4),
                bordered: 0.6 * Math.pow(1 - i / this.pointerTrail.length, 1),
                r: dotSize(i)
            };
        }
    }

    /**
     * Get container dimensions
     */
    _getContainerWidth() {
        return this.targetElement.offsetWidth || window.innerWidth;
    }

    _getContainerHeight() {
        return this.targetElement.offsetHeight || window.innerHeight;
    }

    /**
     * Initialize WebGL context and shaders
     */
    _initWebGL() {
        const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');

        if (!gl) {
            throw new Error('WebGL is not supported by your browser');
        }

        this.gl = gl;

        // Vertex shader source
        const vertexShaderSource = `
            precision mediump float;
            varying vec2 vUv;
            attribute vec2 a_position;

            void main() {
                vUv = .5 * (a_position + 1.);
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Fragment shader source
        const fragmentShaderSource = `
            precision mediump float;

            varying vec2 vUv;
            uniform float u_time;
            uniform float u_ratio;
            uniform float u_size;
            uniform vec2 u_pointer;
            uniform float u_smile;
            uniform vec2 u_target_pointer;
            uniform vec3 u_main_color;
            uniform vec3 u_border_color;
            uniform float u_flat_color;
            uniform sampler2D u_texture;

            #define TWO_PI 6.28318530718
            #define PI 3.14159265358979323846

            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                m = m*m;
                m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g;
                g.x = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            vec2 rotate(vec2 v, float angle) {
                float r_sin = sin(angle);
                float r_cos = cos(angle);
                return vec2(v.x * r_cos - v.y * r_sin, v.x * r_sin + v.y * r_cos);
            }

            float eyes(vec2 uv) {
                uv.y -= .5;
                uv.x *= 1.;
                uv.y *= .8;
                uv.x = abs(uv.x);
                uv.y += u_smile * .3 * pow(uv.x, 1.3);
                uv.x -= (.6 + .2 * u_smile);

                float d = clamp(length(uv), 0., 1.);
                return 1. - pow(d, .08);
            }

            float mouth(vec2 uv) {
                uv.y += 1.5;

                uv.x *= (.5 + .5 * abs(1. - u_smile));
                uv.y *= (3. - 2. * abs(1. - u_smile));
                uv.y -= u_smile * 4. * pow(uv.x, 2.);

                float d = clamp(length(uv), 0., 1.);
                return 1. - pow(d, .07);
            }

            float face(vec2 uv, float rotation) {
                uv = rotate(uv, rotation);
                uv /= (.27 * u_size);

                float eyes_shape = 10. * eyes(uv);
                float mouth_shape = 20. * mouth(uv);

                float col = 0.;
                col = mix(col, 1., eyes_shape);
                col = mix(col, 1., mouth_shape);

                return col;
            }

            void main() {
                vec2 point = u_pointer;
                point.x *= u_ratio;

                vec2 uv = vUv;
                uv.x *= u_ratio;
                uv -= point;

                float texture = texture2D(u_texture, vec2(vUv.x, 1. - vUv.y)).r;
                float shape = texture;

                float noise = snoise(uv * vec2(.7 / u_size, .6 / u_size) + vec2(0., .0015 * u_time));
                noise += 1.2;
                noise *= 2.1;
                noise += smoothstep(-.8, -.2, (uv.y) / u_size);

                float face = face(uv, 5. * (u_target_pointer.x - u_pointer.x));
                shape -= face;

                shape *= noise;

                vec3 border = (1. - u_border_color);
                border.g += .2 * sin(.005 * u_time);
                border *= .5;

                vec3 color = u_main_color;
                color -= (1. - u_flat_color) * border * smoothstep(.0, .01, shape);

                shape = u_flat_color * smoothstep(.8, 1., shape) + (1. - u_flat_color) * shape;
                color *= shape;

                gl_FragColor = vec4(color, shape);
            }
        `;

        // Create and compile shaders
        const vertexShader = this._createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = this._createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

        // Create shader program
        const shaderProgram = this._createShaderProgram(gl, vertexShader, fragmentShader);
        this.uniforms = this._getUniforms(shaderProgram);

        // Setup geometry
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.useProgram(shaderProgram);

        const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Setup texture
        const canvasTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, canvasTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.textureCanvas);
        gl.uniform1i(this.uniforms.u_texture, 0);

        // Set initial uniforms
        gl.uniform1f(this.uniforms.u_size, this.options.size);
        gl.uniform3f(this.uniforms.u_main_color, ...this.options.mainColor);
        gl.uniform3f(this.uniforms.u_border_color, ...this.options.borderColor);
        gl.uniform1f(this.uniforms.u_flat_color, this.options.isFlatColor ? 1 : 0);

        this._resizeCanvas();
    }

    /**
     * Create and compile a shader
     */
    _createShader(gl, sourceCode, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, sourceCode);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    /**
     * Create shader program
     */
    _createShaderProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    /**
     * Get uniform locations
     */
    _getUniforms(program) {
        let uniforms = [];
        let uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            let uniformName = this.gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = this.gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Mouse and touch events on target element
        this.targetElement.addEventListener('mousemove', this._handleMouseMove);
        this.targetElement.addEventListener('touchmove', this._handleTouchMove);
        this.targetElement.addEventListener('click', this._handleClick);

        // Window resize
        window.addEventListener('resize', this._handleResize);
    }

    /**
     * Remove event listeners
     */
    _removeEventListeners() {
        this.targetElement.removeEventListener('mousemove', this._handleMouseMove);
        this.targetElement.removeEventListener('touchmove', this._handleTouchMove);
        this.targetElement.removeEventListener('click', this._handleClick);
        window.removeEventListener('resize', this._handleResize);
    }

    /**
     * Handle mouse move events
     */
    _handleMouseMove(e) {
        const rect = this.targetElement.getBoundingClientRect();
        this._updateMousePosition(e.clientX - rect.left, e.clientY - rect.top);
    }

    /**
     * Handle touch move events
     */
    _handleTouchMove(e) {
        e.preventDefault();
        const rect = this.targetElement.getBoundingClientRect();
        const touch = e.targetTouches[0];
        this._updateMousePosition(touch.clientX - rect.left, touch.clientY - rect.top);
    }

    /**
     * Handle click events
     */
    _handleClick(e) {
        const rect = this.targetElement.getBoundingClientRect();
        this._updateMousePosition(e.clientX - rect.left, e.clientY - rect.top);
    }

    /**
     * Handle window resize
     */
    _handleResize() {
        this._resizeCanvas();
    }

    /**
     * Update mouse position
     */
    _updateMousePosition(eX, eY) {
        this.mouse.moving = true;
        if (this.mouse.controlsPadding < 0) {
            this.mouse.moving = false;
        }

        clearTimeout(this.movingTimer);
        this.movingTimer = setTimeout(() => {
            this.mouse.moving = false;
        }, 300);

        this.mouse.tX = eX;

        const size = this.options.size * this._getContainerHeight();
        eY -= 0.6 * size;
        this.mouse.tY = eY > size ? eY : size;
        this.mouse.tY -= this.mouse.controlsPadding;
    }

    /**
     * Resize canvas to match container
     */
    _resizeCanvas() {
        const width = this._getContainerWidth();
        const height = this._getContainerHeight();

        this.canvas.width = width * this.devicePixelRatio;
        this.canvas.height = height * this.devicePixelRatio;
        this.textureCanvas.width = width;
        this.textureCanvas.height = height;

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.uniforms.u_ratio, this.canvas.width / this.canvas.height);

        // Update trail dot sizes
        const dotSize = (i) => this.options.size * height *
            (1 - 0.2 * Math.pow(3 * i / this.options.tail.dotsNumber - 1, 2));

        for (let i = 0; i < this.options.tail.dotsNumber; i++) {
            this.pointerTrail[i].r = dotSize(i);
        }
    }

    /**
     * Update texture with trail effect
     */
    _updateTexture() {
        this.textureCtx.fillStyle = 'black';
        this.textureCtx.fillRect(0, 0, this.textureCanvas.width, this.textureCanvas.height);

        this.pointerTrail.forEach((p, pIdx) => {
            if (pIdx === 0) {
                p.x = this.mouse.x;
                p.y = this.mouse.y;
            } else {
                p.vx += (this.pointerTrail[pIdx - 1].x - p.x) * this.options.tail.spring;
                p.vx *= this.options.tail.friction;

                p.vy += (this.pointerTrail[pIdx - 1].y - p.y) * this.options.tail.spring;
                p.vy *= this.options.tail.friction;
                p.vy += this.options.tail.gravity;

                p.x += p.vx;
                p.y += p.vy;
            }

            const grd = this.textureCtx.createRadialGradient(p.x, p.y, p.r * p.bordered, p.x, p.y, p.r);
            grd.addColorStop(0, 'rgba(255, 255, 255, ' + p.opacity + ')');
            grd.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.textureCtx.beginPath();
            this.textureCtx.fillStyle = grd;
            this.textureCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            this.textureCtx.fill();
        });
    }

    /**
     * Main render loop
     */
    _render() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.gl.uniform1f(this.uniforms.u_time, currentTime);

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        // Update smile and gravity based on movement
        if (this.mouse.moving) {
            this.options.smile -= 0.05;
            this.options.smile = Math.max(this.options.smile, -0.1);
            this.options.tail.gravity -= 10 * this.options.size;
            this.options.tail.gravity = Math.max(this.options.tail.gravity, 0);
        } else {
            this.options.smile += 0.01;
            this.options.smile = Math.min(this.options.smile, 1);
            if (this.options.tail.gravity > 25 * this.options.size) {
                this.options.tail.gravity = (25 + 5 * (1 + Math.sin(0.002 * currentTime))) * this.options.size;
            } else {
                this.options.tail.gravity += this.options.size;
            }
        }

        // Smooth mouse movement
        this.mouse.x += (this.mouse.tX - this.mouse.x) * this.options.mouseThreshold;
        this.mouse.y += (this.mouse.tY - this.mouse.y) * this.options.mouseThreshold;

        // Update uniforms
        const containerWidth = this._getContainerWidth();
        const containerHeight = this._getContainerHeight();

        this.gl.uniform1f(this.uniforms.u_smile, this.options.smile);
        this.gl.uniform2f(this.uniforms.u_pointer,
            this.mouse.x / containerWidth,
            1 - this.mouse.y / containerHeight
        );
        this.gl.uniform2f(this.uniforms.u_target_pointer,
            this.mouse.tX / containerWidth,
            1 - this.mouse.tY / containerHeight
        );

        this._updateTexture();
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.textureCanvas);

        this.animationId = requestAnimationFrame(this._render);
    }

    // Public API Methods

    /**
     * Start the ghost trail effect
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this._render();
        return this;
    }

    /**
     * Stop the ghost trail effect
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        return this;
    }

    /**
     * Update configuration options
     */
    updateOptions(newOptions) {
        this.options = this._mergeOptions(this.options, newOptions);

        // Update WebGL uniforms if they changed
        if (this.gl && this.uniforms) {
            if (newOptions.size !== undefined) {
                this.gl.uniform1f(this.uniforms.u_size, this.options.size);
                // Update trail dot sizes
                const dotSize = (i) => this.options.size * this._getContainerHeight() *
                    (1 - 0.2 * Math.pow(3 * i / this.options.tail.dotsNumber - 1, 2));
                for (let i = 0; i < this.options.tail.dotsNumber; i++) {
                    this.pointerTrail[i].r = dotSize(i);
                }
            }
            if (newOptions.mainColor !== undefined) {
                this.gl.uniform3f(this.uniforms.u_main_color, ...this.options.mainColor);
            }
            if (newOptions.borderColor !== undefined) {
                this.gl.uniform3f(this.uniforms.u_border_color, ...this.options.borderColor);
            }
            if (newOptions.isFlatColor !== undefined) {
                this.gl.uniform1f(this.uniforms.u_flat_color, this.options.isFlatColor ? 1 : 0);
            }
        }

        return this;
    }

    /**
     * Get current configuration
     */
    getOptions() {
        return { ...this.options };
    }

    /**
     * Destroy the ghost trail instance and clean up resources
     */
    destroy() {
        this.stop();
        this._removeEventListeners();

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        if (this.movingTimer) {
            clearTimeout(this.movingTimer);
        }

        // Clean up WebGL resources
        if (this.gl) {
            this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        }

        // Clear references
        this.canvas = null;
        this.gl = null;
        this.uniforms = null;
        this.textureCanvas = null;
        this.textureCtx = null;
        this.pointerTrail = [];

        return this;
    }

    /**
     * Check if the effect is currently running
     */
    isActive() {
        return this.isRunning;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmokyGhostTrail;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return SmokyGhostTrail; });
} else if (typeof window !== 'undefined') {
    window.SmokyGhostTrail = SmokyGhostTrail;
}