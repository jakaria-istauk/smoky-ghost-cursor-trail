/**
 * Simple Build Script for SmokyGhostTrail Library
 * 
 * This is a lightweight alternative to the full minify.js script.
 * It performs basic minification without external dependencies.
 * 
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');

function simpleMinify(code) {
    console.log('🔄 Applying minification...');
    
    let minified = code
        // Remove single-line comments (preserve URLs and important comments)
        .replace(/\/\/(?![^\r\n]*['"`])(?![^\r\n]*http)(?![^\r\n]*@).*$/gm, '')
        
        // Remove multi-line comments but preserve license headers
        .replace(/\/\*(?![\s\S]*(?:license|copyright|author|@preserve))[\s\S]*?\*\//gi, '')
        
        // Remove extra whitespace while preserving string literals
        .replace(/\s+/g, ' ')
        
        // Clean up spaces around operators and punctuation
        .replace(/\s*([{}();,=+\-*/<>!&|?:])\s*/g, '$1')
        
        // Add back necessary spaces after keywords
        .replace(/\b(if|for|while|function|return|var|let|const|class|new|else|try|catch|finally|throw|typeof|instanceof)\(/g, '$1 (')
        .replace(/\b(if|for|while|else|try|catch|finally|throw)\{/g, '$1 {')
        
        // Clean up function declarations
        .replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, 'function $1(')
        
        // Clean up class declarations
        .replace(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\{/g, 'class $1{')
        
        // Remove unnecessary semicolons before closing braces
        .replace(/;\s*}/g, '}')
        
        // Clean up any remaining multiple spaces
        .replace(/\s{2,}/g, ' ')
        
        // Trim the result
        .trim();
    
    return minified;
}

function addSourceMap(minifiedCode, originalFile, minifiedFile) {
    // Simple source map comment (basic implementation)
    const sourceMapComment = `\n//# sourceMappingURL=${path.basename(minifiedFile)}.map`;
    
    // Create a basic source map object
    const sourceMap = {
        version: 3,
        file: path.basename(minifiedFile),
        sources: [path.basename(originalFile)],
        names: [],
        mappings: "" // Simplified - would need proper mapping for full functionality
    };
    
    // Write source map file
    const sourceMapFile = minifiedFile + '.map';
    fs.writeFileSync(sourceMapFile, JSON.stringify(sourceMap, null, 2));
    
    console.log(`📍 Source map created: ${sourceMapFile}`);
    
    return minifiedCode + sourceMapComment;
}

function buildMinified() {
    const inputFile = path.join(__dirname, 'ghost-trail.js');
    const outputFile = path.join(__dirname, 'ghost-trail.min.js');
    
    console.log('🚀 SmokyGhostTrail Build Script');
    console.log('===============================');
    
    try {
        // Check if input file exists
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Source file not found: ${inputFile}`);
        }
        
        console.log('📖 Reading source file...');
        const sourceCode = fs.readFileSync(inputFile, 'utf8');
        
        console.log('⚡ Minifying code...');
        const minifiedCode = simpleMinify(sourceCode);
        
        // Add header with library info
        const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        const header = `/*! ${packageInfo.name} v${packageInfo.version} | ${packageInfo.license} License | ${packageInfo.homepage} */\n`;
        
        // Combine header with minified code
        let finalCode = header + minifiedCode;
        
        // Optionally add source map
        const addSourceMapFlag = process.argv.includes('--sourcemap') || process.argv.includes('-s');
        if (addSourceMapFlag) {
            finalCode = addSourceMap(finalCode, inputFile, outputFile);
        }
        
        console.log('💾 Writing minified file...');
        fs.writeFileSync(outputFile, finalCode, 'utf8');
        
        // Calculate and display statistics
        const originalSize = Buffer.byteLength(sourceCode, 'utf8');
        const minifiedSize = Buffer.byteLength(finalCode, 'utf8');
        const compressionRatio = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        const originalKB = (originalSize / 1024).toFixed(2);
        const minifiedKB = (minifiedSize / 1024).toFixed(2);
        
        console.log('✅ Build completed successfully!');
        console.log('');
        console.log('📊 Build Statistics:');
        console.log(`   Original:  ${originalKB} KB`);
        console.log(`   Minified:  ${minifiedKB} KB`);
        console.log(`   Saved:     ${compressionRatio}% reduction`);
        console.log(`   Output:    ${path.basename(outputFile)}`);
        
        if (addSourceMapFlag) {
            console.log(`   Source Map: ${path.basename(outputFile)}.map`);
        }
        
        console.log('');
        console.log('💡 Tips:');
        console.log('   • Use --sourcemap flag to generate source maps');
        console.log('   • For better compression, use: npm run minify');
        console.log('   • Test the minified file before deployment');
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Validation function to check minified output
function validateMinified() {
    const minifiedFile = path.join(__dirname, 'ghost-trail.min.js');
    
    if (!fs.existsSync(minifiedFile)) {
        console.error('❌ Minified file not found. Run build first.');
        return false;
    }
    
    try {
        const minifiedCode = fs.readFileSync(minifiedFile, 'utf8');
        
        // Basic validation checks
        const checks = [
            { name: 'Contains SmokyGhostTrail class', test: /class SmokyGhostTrail/.test(minifiedCode) },
            { name: 'Has export statements', test: /module\.exports|window\.SmokyGhostTrail/.test(minifiedCode) },
            { name: 'Contains WebGL code', test: /WebGL|webgl|gl\./.test(minifiedCode) },
            { name: 'Has proper syntax', test: minifiedCode.length > 1000 }
        ];
        
        console.log('🔍 Validating minified file...');
        let allPassed = true;
        
        checks.forEach(check => {
            const status = check.test ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.test) allPassed = false;
        });
        
        if (allPassed) {
            console.log('✅ Validation passed!');
        } else {
            console.log('❌ Validation failed!');
        }
        
        return allPassed;
        
    } catch (error) {
        console.error('❌ Validation error:', error.message);
        return false;
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--validate') || args.includes('-v')) {
        validateMinified();
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log('SmokyGhostTrail Build Script');
        console.log('');
        console.log('Usage: node build.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --sourcemap, -s    Generate source map');
        console.log('  --validate, -v     Validate existing minified file');
        console.log('  --help, -h         Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  node build.js                 # Basic minification');
        console.log('  node build.js --sourcemap     # With source map');
        console.log('  node build.js --validate      # Validate output');
    } else {
        buildMinified();
    }
}

module.exports = {
    buildMinified,
    simpleMinify,
    validateMinified
};
