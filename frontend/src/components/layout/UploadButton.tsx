"use client";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";

// Opens the create-meeting dialog. The dialog itself is wired in with the create/edit/delete UI.
export function UploadButton() {
  return (
    <Button variant="primary" disabled title="Upload arrives with the create dialog">
      <Upload className="size-4" />
      <span className="hidden sm:inline">Upload</span>
    </Button>
  );
}
