import React from "react";

export const ColoredSummary: React.FC<{ summary: string }> = ({ summary }) => {
  return (
    <>
      {summary.split(" ").map((word, wordIndex) => {
        if (word === "stole") {
          return (
            <span key={wordIndex} className="text-[#FF6B35] font-semibold mr-1">
              {word}{" "}
            </span>
          );
        } else if (word === "won") {
          return (
            <span key={wordIndex} className="text-green-500 font-semibold mr-1">
              {word}{" "}
            </span>
          );
        } else if (word.startsWith("@")) {
          return (
            <span 
              key={wordIndex} 
              className="text-[#FF6B35] font-semibold mr-1 underline decoration-dotted decoration-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              {word}{" "}
            </span>
          );
        } else if (word.includes("tokens") || word.includes("token") || /\d+/.test(word)) {
          return (
            <span key={wordIndex} className="text-purple-400 font-semibold mr-1">
              {word}{" "}
            </span>
          );
        }
        return <React.Fragment key={wordIndex}>{word} </React.Fragment>;
      })}
    </>
  );
};
