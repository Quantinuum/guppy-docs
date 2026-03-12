import { CodeSnippet } from './code_snippet'
import { DocsFooter, DocsNavBar } from '@quantinuum/quantinuum-ui'
import { Button, Separator } from '@quantinuum/quantinuum-ui'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const featureConfig = [
  {
    title: 'Arbitrary Control Flow',
    description:
      'Full quantum measurement-dependent control flow: write if-else conditions, for and while loops, all in Python style.',
  },
  {
    title: 'Strongly Typed',
    description:
      'The guppylang compiler uses a powerful but unobtrusive type system to provide helpful error messages.',
  },
  {
    title: 'Qubit Safety',
    description:
      'Qubits have a linear type, following an intuitive ownership model that prevents no-cloning errors and memory leaks.',
  },
  {
    title: 'Metaprogramming',
    description:
      'Generate and transform Guppy code at compile time to automate patterns, optimise circuits, and reduce repetition.',
  },
  {
    title: 'Classical Compute',
    description:
      'Perform classical calculations and data manipulation alongside quantum operations seamlessly.',
  },
  {
    title: 'Data Structures',
    description:
      'Work with arrays, tuples, and user-defined types in both classical and quantum contexts.',
  },
  {
    title: 'First-class Functions',
    description:
      'Define functions to write structured quantum software, and pass them just like any other value.',
  },
  {
    title: 'Legacy Support',
    description:
      'Easily integrate with existing quantum toolchains like pytket — bridging the gap with legacy circuit-building tools.',
  },
]

const guppy_code_2 = `from guppylang import guppy
from guppylang.std.quantum import qubit, toffoli, s, z, measure
from guppylang.std.quantum.functional import h

@guppy
def repeat_until_success(q: qubit, attempts: int) -> bool:
    """
    Repeat-until-success circuit for Rz(acos(3/5))
    from Nielsen and Chuang, Fig. 4.17.
    """
    for i in range(attempts):
        a, b = h(qubit()), h(qubit())
        toffoli(a, b, q)
        s(q)
        toffoli(a, b, q)
        if not (measure(h(a)) | measure(h(b))):
            result("rus_failed_attempts", i)
            return True
        z(q)
    result("rus_failed_attempts", attempts)
    return False
repeat_until_success.check() # type check`

export default async function Home() {
  const examples = [
    {
      title: 'Magic State Distillation',
      description:
        'Crucial protocols for Quantum Error Correction like magic state distillation require complex measurement dependent logic - Guppy expresses these naturally.',
      className: 'bg-gradient-to-b from-[#644F68] to-[#C42C4C]',
      image: 'magic.svg',
      href: '/guppy/guppylang/examples/t_factory.html',
    },
    {
      title: 'Post-selection',
      description:
        'Exit a shot when an error is detected without running any more operations.',
      className: 'bg-gradient-to-b from-[#3F8D82] to-[#699B31]',
      image: 'select.svg',
      href: '/guppy/guppylang/examples/postselect.html',
    },
    {
      title: 'N-qubit Graph States',
      description:
        'Use Python metaprogramming and Guppy polymorphism to write scalable and type safe state preparation.',
      className: 'bg-gradient-to-b from-[#316278] to-[#3E9595]',
      image: 'qubit.svg',
      href: '/guppy/guppylang/examples/ghz_and_graph.html',
    },
  ]

  return (
    <div>
      <DocsNavBar activePath="/guppy"></DocsNavBar>

      <header className="bg-muted/30 overflow-hidden ">
        <div className="container">
          <div className="flex flex-col items-center md:flex-row md:gap-16 gap-8">
            <div className="md:w-1/2 pt-16 md:py-24">
              <h1 className="mb-6 flex flex-col items-center md:items-start">
                <Image
                  alt="guppy logo"
                  src="guppy_logo_type.svg"
                  width={325}
                  height={75}
                  className="hidden md:block"
                />
                <Image
                  alt="guppy logo"
                  src="guppy_logo_type.svg"
                  width={255}
                  height={75}
                  className="block md:hidden"
                />
              </h1>
              <h2 className="mb-6 text-xl text-center md:text-left md:text-2xl text-muted-foreground tracking-tight">
                Quantum-first programming <br />
                language, embedded in Python.
              </h2>
              <Button
                asChild
                className="hover:cursor-pointer px-20 py-6 bg-[#30A08E] text-lg tracking-tight font-semibold"
              >
                <Link href="/guppy/getting_started.html"> Get Started</Link>
              </Button>
            </div>

            <Image
              alt="guppy logo"
              src="guppy_ring.svg"
              width={550}
              height={125}
              className="hidden md:block -my-24 -mr-6"
            />
            <Image
              alt="guppy logo"
              src="guppy_ring.svg"
              width={300}
              height={100}
              className="-mb-12 block md:hidden "
            />
          </div>
        </div>
      </header>
      <Separator />
      <div className="">
        <section className="container grid grid-cols-1 lg:grid-cols-[4fr_6fr] gap-8 lg:gap-20 py-16 lg:py-24 lg:items-center">
          <div className="flex flex-col gap-12">
            {[
              {
                title: 'Expressive',
                description: `Write code that reads like the problem you’re solving. Guppy’s syntax is clear, concise, and flexible enough to capture complex quantum and classical logic without unnecessary boilerplate.`,
              },
              {
                title: 'Safe',
                description: `Guppy’s type system catches costly mistakes before they happen — including quantum-specific hazards.`,
              },
              {
                title: 'Pythonic',
                description: `If you can read Python, you can read Guppy. Its design is inspired by Python’s readability and simplicity, making it easy to learn. Guppy also lives inside Python, allowing seamless inter-op.`,
              },
            ].map(({ title, description }) => {
              return (
                <div>
                  <h3 className="tracking-tight text-3xl font-medium mb-3">
                    {title}
                  </h3>
                  <p className="text-muted-foreground leading-6 tracking-tight text-base">
                    {description}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="w-full shadow-md border border-border/60 text-[0.8rem] p-6 text-foreground rounded-lg overflow-auto flex-shrink flex-grow-0 relative">
            <CodeSnippet lang="python" code={guppy_code_2}></CodeSnippet>
          </div>
        </section>
      </div>
      <Separator />

      <section className="bg-muted/30 ">
        <div className="container flex flex-col items-center py-16 lg:py-24">
          <h2 className="text-5xl tracking-tight mb-3 font-medium">Features</h2>
          <p className="tracking-tight font-medium text-muted-foreground text-center">
            Everything you'd expect from a modern programming language.
          </p>
          <div className="flex flex-wrap flex-col lg:flex-row gap-5 lg:gap-8 items-stretch lg:justify-center my-12">
            {featureConfig.map((feature) => {
              return (
                <div
                  key={feature.title}
                  className="bg-background self-stretch lg:w-[calc(33.333%-1.75rem)] shadow-md rounded-2xl border border-border/60  p-6 py-5 pb-6 text-xl"
                >
                  <p className="tracking-tighter font-medium mb-1">
                    {feature.title}
                  </p>
                  <p className="tracking-tight text-muted-foreground font-medium text-sm leading-5">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
          <Link
            className="font-medium tracking-tight underline whitespace-nowrap text-muted-foreground"
            href="/guppy/language_guide/language_guide_index.html"
          >
            Read Language Guide {'->'}
          </Link>
        </div>
      </section>
      <Separator />

      <section className="bg-muted/30">
        <div className="container flex flex-col items-center py-16 lg:py-24">
          <h2 className="text-5xl tracking-tight mb-3 font-medium">Examples</h2>
          <p className="tracking-tight font-medium text-muted-foreground">
            Some novel use cases with guppy.
          </p>
          <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-3 my-12">
            {examples.map((feature) => {
              return (
                <div
                  key={feature.title}
                  className="border border-border/60 shadow-md flex flex-col rounded-xl bg-background p-5"
                >
                  <div
                    className={
                      'flex items-end p-4 rounded-lg h-[8rem] mb-4 ' +
                      feature.className
                    }
                  >
                    <Image
                      alt={`${feature.title} icon`}
                      src={feature.image}
                      width={50}
                      height={50}
                    />
                  </div>
                  <p className="text-2xl font-medium tracking-tight mb-3">
                    {feature.title}
                  </p>
                  <p className="text-sm text-muted-foreground tracking-tight font-medium mb-6">
                    {feature.description}
                  </p>
                  <Link
                    className="hover:bg-foreground hover:cursor-pointer transition hover:text-background bg-muted rounded-lg  p-3 text-center tracking-tight font-medium mt-auto flex justify-center gap-2 items-center"
                    href={feature.href}
                  >
                    <span className="block"> Open Notebook</span>{' '}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
          <Link
            className="font-medium tracking-tight underline whitespace-nowrap text-muted-foreground"
            href="/guppy/examples_index.html"
          >
            More Examples {'->'}
          </Link>
        </div>
      </section>
      <Separator />
      <section className="">
        <div className="container pt-16 lg:pt-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div>
            <h2 className="text-5xl tracking-tight mb-5 font-medium">
              Open Source
            </h2>
            <p className="tracking-tight text-xl text-muted-foreground leading-7">
              The guppylang compiler and the target HUGR intermediate
              representation are open source, and welcome contributions!
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { title: 'guppylang', href: 'https://github.com/quantinuum/guppylang' },
              { title: 'hugr', href: 'https://github.com/quantinuum/hugr' },
            ].map((item) => {
              return (
                <Link
                  className="group transition-all hover:bg-foreground hover:cursor-pointer hover:text-background border border-border/60 shadow-md  rounded-lg  p-6 text-center tracking-tight font-medium mt-auto flex  gap-4 items-center"
                  href={item.href}
                  target="_blank"
                  rel="noreferer"
                >
                  <Image
                    alt={`github icon`}
                    src="github.svg"
                    width={35}
                    height={35}
                    className="group-hover:invert"
                  />
                  <span className="block text-lg"> {item.title}</span>{' '}
                  <ArrowRight className="w-6 h-6 ml-auto" />
                </Link>
              )
            })}
          </div>
        </div>
      </section>
      <div className="container">
        <DocsFooter />
      </div>
    </div>
  )
}
