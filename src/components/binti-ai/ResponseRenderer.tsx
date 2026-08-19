import React, { memo } from "react";

export interface ResponseRendererProps {
  content: string;
  isUser: boolean;
}

export const ResponseRenderer = memo(function ResponseRenderer({ 
  content, 
  isUser 
}: ResponseRendererProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  const cleanContent = (content || "")
    .replace(/^\[?\s*Approve\s*&\s*Execute(?:\s*Import|\s*Button)?\s*\]?$/gim, '')
    .replace(/\[\s*Approve\s*&\s*Execute[^\]]*\]/gi, '')
    .replace(/Click\s+(?:the\s+)?(?:\[?\s*Approve\s*&\s*Execute\s*\]?|button\s+below)\s+to\s+[^.\n]+[.\n]?/gi, '')
    .replace(/^[-*_]{3,}$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = cleanContent.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  const processInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={pIdx} className="italic text-gray-800">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={pIdx} className="bg-purple-50 text-[#80237E] px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderCurrentTable = (key: number) => {
    if (tableRows.length === 0 && tableHeader.length === 0) return null;
    const header = tableHeader;
    const rows = tableRows;
    tableHeader = [];
    tableRows = [];
    inTable = false;

    return (
      <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-purple-100/80 shadow-2xs">
        <table className="w-full text-left text-xs border-collapse bg-white">
          {header.length > 0 && (
            <thead>
              <tr className="bg-purple-50/70 border-b border-purple-100 text-[#80237E] font-bold">
                {header.map((h, hIdx) => (
                  <th key={hIdx} className="px-3 py-2 text-[11px] tracking-wide">
                    {processInlineFormatting(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-50 text-xs">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-purple-50/30 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-gray-800">
                    {processInlineFormatting(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").slice(1, -1);
      if (cells.every(c => c.trim().replace(/:/g, '').replace(/-/g, '') === '')) {
        return;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      elements.push(renderCurrentTable(index));
    }

    if (/^([-*_]){3,}$/.test(trimmed)) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("> ")) {
      elements.push(
        <div key={index} className="my-2 px-3 py-2 bg-amber-50/80 border-l-3 border-amber-400 rounded-r-xl text-xs text-amber-900">
          {processInlineFormatting(trimmed.slice(2))}
        </div>
      );
      return;
    }

    if (trimmed.startsWith("#")) {
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      const level = (trimmed.match(/^#+/) || ['#'])[0].length;
      if (level === 1) {
        elements.push(
          <h2 key={index} className="text-sm font-extrabold text-gray-900 mt-2.5 mb-1 flex items-center space-x-1.5 border-b border-gray-100 pb-1">
            <span>{processInlineFormatting(headingText)}</span>
          </h2>
        );
      } else if (level === 2) {
        elements.push(
          <h3 key={index} className="text-xs font-bold text-gray-900 mt-2 mb-0.5">
            {processInlineFormatting(headingText)}
          </h3>
        );
      } else {
        elements.push(
          <h4 key={index} className="text-[11px] font-bold text-[#80237E] uppercase tracking-wider mt-1.5 mb-0.5">
            {processInlineFormatting(headingText)}
          </h4>
        );
      }
      return;
    }

    if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bulletText = trimmed.replace(/^[•\-*]\s+/, '');
      elements.push(
        <div key={index} className="flex items-start space-x-2 my-0.5 pl-1 text-xs">
          <span className="text-[#80237E] font-bold leading-none mt-1 shrink-0">•</span>
          <div className="flex-1 text-gray-800 leading-relaxed">
            {processInlineFormatting(bulletText)}
          </div>
        </div>
      );
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={index} className="flex items-start space-x-2 my-0.5 pl-1 text-xs">
          <span className="text-[#80237E] font-bold text-[11px] leading-tight shrink-0">{numberedMatch[1]}.</span>
          <div className="flex-1 text-gray-800 leading-relaxed">
            {processInlineFormatting(numberedMatch[2])}
          </div>
        </div>
      );
      return;
    }

    if (trimmed === "") {
      elements.push(<div key={index} className="h-1.5" />);
      return;
    }

    elements.push(
      <p key={index} className="my-0.5 text-xs text-gray-800 leading-relaxed">
        {processInlineFormatting(trimmed)}
      </p>
    );
  });

  if (inTable) {
    elements.push(renderCurrentTable(lines.length));
  }

  return <div className="space-y-0.5 font-sans">{elements}</div>;
});
