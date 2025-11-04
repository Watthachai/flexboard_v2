"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createDashboard } from "@/lib/api";
import { DashboardConfig } from "@/types/dashboard";
import { Loader2, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateDashboardWizardProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, name: "Basic Info", description: "Dashboard details" },
  { id: 2, name: "Review", description: "Review and create" },
];

export function CreateDashboardWizard({
  open,
  onClose,
  tenantId,
  onSuccess,
}: CreateDashboardWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    tags: [] as string[],
  });

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("Dashboard name is required");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Create dashboard config
      const config: DashboardConfig = {
        layout: "grid",
        theme: "light",
        widgets: [],
        gridCols: 12,
        gridRowHeight: 100,
        autoRefresh: false,
        refreshInterval: 300,
      };

      // Create dashboard
      await createDashboard(tenantId, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        tags: formData.tags,
        config,
      });

      toast.success("Dashboard created successfully!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error creating dashboard:", error);
      toast.error(error.message || "Failed to create dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      name: "",
      description: "",
      category: "",
      tags: [],
    });
    setTagInput("");
    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Dashboard</DialogTitle>
          <DialogDescription>
            Set up your dashboard. You can configure data sources and widgets
            later.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="text-xs mt-1 text-center">
                  <div className="font-medium">{step.name}</div>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    currentStep > step.id ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Start by creating a dashboard. You can add data sources and
                  design widgets in the dashboard editor.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="name">Dashboard Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Sales Dashboard"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what this dashboard shows..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Sales, Marketing, Operations"
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tags..."
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Review your dashboard details before creating. You can edit
                  these later in the dashboard settings.
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Dashboard Details</h3>
                <div className="text-sm space-y-2">
                  <div>
                    <span className="text-gray-600">Name:</span>{" "}
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  {formData.description && (
                    <div>
                      <span className="text-gray-600">Description:</span>{" "}
                      {formData.description}
                    </div>
                  )}
                  {formData.category && (
                    <div>
                      <span className="text-gray-600">Category:</span>{" "}
                      {formData.category}
                    </div>
                  )}
                  {formData.tags.length > 0 && (
                    <div>
                      <span className="text-gray-600">Tags:</span>{" "}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  💡 <strong>Next steps:</strong> After creating the dashboard,
                  you can:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Add data sources in the dashboard settings</li>
                    <li>Design widgets and charts</li>
                    <li>Configure auto-refresh and filters</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
          >
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Dashboard
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
