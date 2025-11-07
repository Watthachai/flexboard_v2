"use client";

import { DiffEditor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, FileJson } from "lucide-react";

interface MonacoDiffViewerProps {
  originalConfig: any;
  modifiedConfig: any;
  onApply: () => void;
  onReject: () => void;
  explanation?: string;
}

export function MonacoDiffViewer({
  originalConfig,
  modifiedConfig,
  onApply,
  onReject,
  explanation,
}: MonacoDiffViewerProps) {
  // Debug logging
  console.log("🎨 MonacoDiffViewer rendered!");
  console.log("🎨 originalConfig:", originalConfig);
  console.log("🎨 modifiedConfig:", modifiedConfig);

  // Check if this is a partial update (only widgets, no layout)
  const isPartialUpdate = modifiedConfig.widgets && !modifiedConfig.layout;
  console.log("🎨 isPartialUpdate:", isPartialUpdate);

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

  return (
    <Card className="mt-3 overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-50 to-purple-50 px-4 py-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <FileJson className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-sm">AI Suggested Changes</span>
        </div>
        {explanation && <p className="text-sm text-gray-700">{explanation}</p>}
      </div>

      {/* Monaco Diff Editor */}
      <div className="h-[400px]">
        <DiffEditor
          original={originalJson}
          modified={modifiedJson}
          language="json"
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            folding: true,
            diffWordWrap: "on",
            renderOverviewRuler: false,
            fontFamily:
              "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
            fontLigatures: true,
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 p-4 bg-gray-50 border-t">
        <Button
          onClick={onApply}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-2" />
          Apply Changes to Editor
        </Button>
        <Button onClick={onReject} variant="outline" className="flex-1">
          <X className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </Card>
  );
}
