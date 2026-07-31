build-docs:
    cd sphinx && uv run --group docs sphinx-build -b html . build

build:
    just build-docs

serve: build
    npm exec serve sphinx/build

build-debug:
    cd sphinx && uv run --group docs sphinx-build -b html . build -D nb_execution_raise_on_error=0

serve-debug: build-debug
    npm exec serve sphinx/build

link-check:
    cd sphinx && uv run sphinx-build -b linkcheck . build

coverage:
    cd sphinx && uv run sphinx-build -W -v -b coverage . build/coverage

cleanup:
    rm -rf sphinx/jupyter_execute
    rm -rf sphinx/.jupyter_cache
    rm -rf sphinx/build
    rm -rf sphinx/api/generated