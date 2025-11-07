"use client";

import { DiffEditor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, FileJson, Minimize2 } from "lucide-react";
import { useState } from "react";

interface FloatingDiffPanelProps {
  originalConfig: any;
  modifiedConfig: any;
  onApply: () => void;
  onReject: () => void;
  explanation?: string;
}

export function FloatingDiffPanel({
  originalConfig,
  modifiedConfig,
  onApply,
  onReject,
  explanation,
}: FloatingDiffPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // Check if this is a partial update (only widgets, no layout)
  const isPartialUpdate = modifiedConfig.widgets && !modifiedConfig.layout;

  let originalJson: string;
  let modifiedJson: string;

  if (isPartialUpdate) {
    // Show only the modified widget(s) in side-by-side comparison
    const modifiedWidgetIds = modifiedConfig.widgets.map((w: any) => w.id);

    // Find original versions of these widgets
    const originalWidgets =
      originalConfig.widgets?.filter((w: any) =>
        modifiedWidgetIds.includes(w.id)
      ) || [];

    // For new widgets, show empty object on left side
    const paddedOriginalWidgets = modifiedConfig.widgets.map(
      (modWidget: any) => {
        const original = originalWidgets.find(
          (w: any) => w.id === modWidget.id
        );
        return original || { id: modWidget.id, title: "(New Widget)" };
      }
    );

    originalJson = JSON.stringify({ widgets: paddedOriginalWidgets }, null, 2);
    modifiedJson = JSON.stringify({ widgets: modifiedConfig.widgets }, null, 2);
  } else {
    // Full config comparison
    originalJson = JSON.stringify(originalConfig, null, 2);
    modifiedJson = JSON.stringify(modifiedConfig, null, 2);
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <FileJson className="h-4 w-4 mr-2" />
          Show AI Suggestion
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-full w-[600px] z-50 shadow-2xl border-l">
      <Card className="h-full rounded-none flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            <div>
              <h3 className="font-semibold text-sm">AI Suggested Changes</h3>
              {explanation && (
                <p className="text-xs text-blue-100 mt-0.5">{explanation}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="text-white hover:bg-white/20"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Monaco Diff Editor */}
        <div className="flex-1 overflow-hidden">
          <DiffEditor
            original={originalJson}
            modified={modifiedJson}
            language="json"
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: false, // Inline diff
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              folding: true,
              renderOverviewRuler: true,
              fontFamily:
                "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
              fontLigatures: true,
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 p-4 bg-gray-900 border-t border-gray-700">
          <Button
            onClick={onApply}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Apply Changes
          </Button>
          <Button
            onClick={onReject}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      </Card>
    </div>
  );
}
