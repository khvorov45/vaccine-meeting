deno bundle titre-visualizer.ts bundle.js 2>&1 | awk '/TS/ { msg=gensub(".*TS.*\\[(.*)\\]:(.*)", "\\1\\2", "g"); } /at .*file:\/\// { filepath=gensub(" +at .*file://(.*)", "\\1", "g"); print filepath " " msg; } /Module not found/ {print}'

if [ "$1" = "release" ]; then
    html-minifier-terser --collapse-whitespace --minify-css true titre-visualizer.html -o index.html
fi
