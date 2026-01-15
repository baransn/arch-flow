import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Arch Flow
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Visualize and animate system architecture from any GitHub repository
          </p>

          {/* How to use */}
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-4">How to use</h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Just add any GitHub repository path to the URL:
            </p>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm mb-6">
              <span className="text-gray-500">gliss.dev/</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">owner/repo</span>
            </div>

            {/* Examples */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Try these examples:
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <Link
                  href="/vercel/next.js"
                  className="block p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg group"
                >
                  <div className="font-mono text-sm opacity-90">vercel/next.js</div>
                  <div className="text-xs opacity-75 mt-1">React Framework</div>
                </Link>

                <Link
                  href="/facebook/react"
                  className="block p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg group"
                >
                  <div className="font-mono text-sm opacity-90">facebook/react</div>
                  <div className="text-xs opacity-75 mt-1">UI Library</div>
                </Link>

                <Link
                  href="/microsoft/vscode"
                  className="block p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg group"
                >
                  <div className="font-mono text-sm opacity-90">microsoft/vscode</div>
                  <div className="text-xs opacity-75 mt-1">Code Editor</div>
                </Link>

                <Link
                  href="/anthropics/anthropic-sdk-typescript"
                  className="block p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg group"
                >
                  <div className="font-mono text-sm opacity-90">anthropics/anthropic-sdk-typescript</div>
                  <div className="text-xs opacity-75 mt-1">Claude SDK</div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🏗️</div>
            <h3 className="text-lg font-semibold mb-2">Auto-Generate Diagrams</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered analysis creates accurate architecture diagrams from your codebase
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="text-lg font-semibold mb-2">Animated Flows</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Watch requests flow through your system end-to-end with interactive animations
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Instant Results</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cached analyses mean returning visitors get instant access to diagrams
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
