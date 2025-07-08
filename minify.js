#!/usr/bin/env node

/**
 * JavaScript Minifier for SmokyGhostTrail Library
 * 
 * This script minifies the ghost-trail.js file to create a production-ready version.
 * It uses Terser for advanced JavaScript minification with optimal settings.
 * 
 * Usage:
 * node minify.js
 * 
 * Or add to package.json scripts:
 * "minify": "node minify.js"
 */

const fs = require('fs');
const path = require('path');

// Simple minification function (fallback if Terser is not available)
function simpleMinify(code) {
    return code
        // Remove single-line comments (but preserve URLs and regex)
        .replace(/\/\/(?![^\r\n]*['"`]).*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace and newlines
        .replace(/\s+/g, ' ')
        // Remove spaces around operators and punctuation
        .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
        // Remove spaces after keywords
        .replace(/\b(if|for|while|function|return|var|let|const|class|new)\s+/g, '$1 ')
        // Clean up any remaining extra spaces
        .replace(/\s+/g, ' ')
        .trim();
}

// Advanced minification using Terser (if available)
async function advancedMinify(code) {
    try {
        const { minify } = require('terser');
        
        const result = await minify(code, {
            compress: {
                dead_code: true,
                drop_console: false, // Keep console.error for debugging
                drop_debugger: true,
                keep_fargs: false,
                unused: true,
                join_vars: true,
                collapse_vars: true,
                reduce_vars: true,
                warnings: false,
                pure_getters: true,
                unsafe: false,
                unsafe_comps: false,
                unsafe_math: false,
                unsafe_proto: false,
                unsafe_regexp: false,
                conditionals: true,
                evaluate: true,
                booleans: true,
                loops: true,
                if_return: true,
                inline: true,
                properties: true,
                hoist_funs: true,
                hoist_props: true,
                hoist_vars: false,
                side_effects: true,
                pure_funcs: null,
                keep_fnames: false,
                keep_infinity: false,
                top_retain: null,
                passes: 3
            },
            mangle: {
                toplevel: false,
                keep_fnames: false,
                reserved: ['SmokyGhostTrail'] // Preserve main class name
            },
            format: {
                comments: false,
                beautify: false,
                semicolons: true,
                preserve_annotations: false
            },
            sourceMap: false,
            toplevel: false,
            nameCache: null,
            ie8: false,
            keep_fnames: false,
            safari10: false
        });

        if (result.error) {
            throw result.error;
        }

        return result.code;
    } catch (error) {
        console.warn('Terser not available, falling back to simple minification:', error.message);
        return simpleMinify(code);
    }
}

// Main minification function
async function minifyFile() {
    const inputFile = path.join(__dirname, 'ghost-trail.js');
    const outputFile = path.join(__dirname, 'ghost-trail.min.js');
    
    try {
        // Check if input file exists
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Input file not found: ${inputFile}`);
        }

        console.log('🔄 Reading source file...');
        const sourceCode = fs.readFileSync(inputFile, 'utf8');
        
        console.log('⚡ Minifying JavaScript...');
        const minifiedCode = await advancedMinify(sourceCode);
        
        // Add header comment to minified file
        const header = `/*! SmokyGhostTrail v1.0.1 | MIT License | https://github.com/jakaria-istauk/smoky-ghost-cursor-trail */\n`;
        const finalCode = header + minifiedCode;
        
        console.log('💾 Writing minified file...');
        fs.writeFileSync(outputFile, finalCode, 'utf8');
        
        // Calculate compression stats
        const originalSize = Buffer.byteLength(sourceCode, 'utf8');
        const minifiedSize = Buffer.byteLength(finalCode, 'utf8');
        const compressionRatio = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        
        console.log('✅ Minification complete!');
        console.log(`📊 Original size: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`📊 Minified size: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`📊 Compression: ${compressionRatio}% smaller`);
        console.log(`📁 Output: ${outputFile}`);
        
    } catch (error) {
        console.error('❌ Minification failed:', error.message);
        process.exit(1);
    }
}

// Install Terser if not available
function installTerser() {
    try {
        require('terser');
        return true;
    } catch (error) {
        console.log('📦 Terser not found. Installing...');
        const { execSync } = require('child_process');
        
        try {
            execSync('npm install terser --save-dev', { stdio: 'inherit' });
            console.log('✅ Terser installed successfully!');
            return true;
        } catch (installError) {
            console.warn('⚠️  Could not install Terser automatically. Using simple minification.');
            console.log('💡 To get better minification, run: npm install terser --save-dev');
            return false;
        }
    }
}

// CLI interface
if (require.main === module) {
    console.log('🚀 SmokyGhostTrail Minifier');
    console.log('============================');
    
    // Check for Terser and install if needed
    installTerser();
    
    // Run minification
    minifyFile().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

// Export for programmatic use
module.exports = {
    minifyFile,
    simpleMinify,
    advancedMinify
};
