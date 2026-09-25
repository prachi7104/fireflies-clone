"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { Button } from "@/components/ui/Button";

export function UploadButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        <span className="hidden sm:inline">Upload</span>
      </Button>
      <CreateMeetingDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
