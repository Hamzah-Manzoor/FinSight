import React from 'react'

interface CalculatorShellProps {
  inputPanel: React.ReactNode
  resultPanel: React.ReactNode
  breakdownPanel: React.ReactNode
}

export function CalculatorShell({
  inputPanel,
  resultPanel,
  breakdownPanel,
}: CalculatorShellProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* Left: sticky input panel */}
        <div className="lg:sticky lg:top-20">{inputPanel}</div>
        {/* Right: results + chart */}
        <div className="flex flex-col gap-6">{resultPanel}</div>
      </div>
      {/* Full-width breakdown table */}
      <div className="mt-8">{breakdownPanel}</div>
    </div>
  )
}
