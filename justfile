build-docs:
    cd sphinx && uv run --group docs sphinx-build -b html . build -W

build-landing:
    cd landing && npm i --frozen-lockfile && npm run build
    mkdir -p build
    cp -R ./sphinx/build/. ./build/.
    cp -R ./landing/dist/. ./build/.

build:
    just build-docs
    just build-landing

serve: build
    npm exec serve build

build-debug:
    cd sphinx && uv run --group docs sphinx-build -b html . build -D nb_execution_raise_on_error=0

serve-debug: build-debug
    npm exec serve sphinx/build

link-check:
    cd sphinx && uv run sphinx-build -b linkcheck . build -W

coverage:
    cd sphinx && uv run sphinx-build -W -v -b coverage . build/coverage

cleanup:
    rm -rf sphinx/jupyter_execute
    rm -rf sphinx/.jupyter_cache
    rm -rf sphinx/build
    rm -rf sphinx/api/generated
    rm -rf landing/dist
    rm -rf build