deno bundle --config titre-visualizer/deno.jsonc titre-visualizer/titre-visualizer.ts titre-visualizer/bundle.js 2>&1 | awk '/TS/ { msg=gensub(".*TS.*\\[(.*)\\]:(.*)", "\\1\\2", "g"); } /at .*file:\/\// { filepath=gensub(" +at .*file://(.*)", "\\1", "g"); print filepath " " msg; } /Module not found/ {print}'

if [ "$1" = "release" ]; then
    html-minifier-terser --collapse-whitespace --minify-css true titre-visualizer/titre-visualizer.html -o titre-visualizer/index.html
fi
