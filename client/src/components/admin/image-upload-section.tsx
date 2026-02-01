"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Trash as DeleteIcon } from "lucide-react";
import { DragEvent } from "react";

interface ImageUploadSectionProps {
  images: string[];
  productImages: File[];
  isDragging: boolean;
  draggingIndex: number | null;
  loadingIndex: number | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onImageUpload: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onRemoveAll: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUploadSection({
  images,
  isDragging,
  draggingIndex,
  loadingIndex,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onImageUpload,
  onRemoveImage,
  onRemoveAll,
  onInputChange,
}: ImageUploadSectionProps) {
  return (
    <div className="flex gap-5 flex-wrap">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/png"
        onChange={onInputChange}
        multiple
      />
      <div className="flex w-full gap-5 flex-col h-full custom-md:flex-row">
        <Button
          variant="secondary"
          className={`bg-white w-full h-80 flex justify-center items-center p-0 custom-md:w-[50%] dark:bg-neutral-900 hover:dark:!bg-neutral-800 ${
            isDragging && draggingIndex === 0 ? "dragging" : ""
          }`}
          onDrop={(e: any) => onDrop(e, 0)}
          onDragOver={(e: any) => onDragOver(e, 0)}
          onDragLeave={onDragLeave}
          onClick={() => onImageUpload(0)}
        >
          {loadingIndex === 0 ? (
            <Spinner color="secondary" />
          ) : images[0] ? (
            <Image
              src={images[0]}
              className="h-80 w-full max-lg:h-full max-lg:w-full object-contain"
              alt="Uploaded"
              width={800}
              height={800}
            />
          ) : (
            "Click or Drop here"
          )}
        </Button>
        <div className="flex items-center justify-center gap-3 custom-md:w-[50%] flex-wrap">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`relative bg-white w-20 h-20 items-center justify-center custom-md:w-[48%] custom-md:h-[48%] dark:bg-neutral-900 rounded-md ${
                isDragging && draggingIndex === index ? "dragging ring-2 ring-primary" : ""
              }`}
            >
              <Button
                variant="secondary"
                className="w-full h-full"
                onDrop={(e: any) => onDrop(e, index)}
                onDragOver={(e: any) => onDragOver(e, index)}
                onDragLeave={onDragLeave}
                onClick={() => onImageUpload(index)}
              >
                {loadingIndex === index ? (
                  <Spinner color="secondary" />
                ) : images[index] ? (
                  <Image
                    className="object-contain h-20 w-20 max-lg:h-full max-lg:w-full"
                    src={images[index]}
                    alt={`Uploaded ${index}`}
                    width={800}
                    height={800}
                  />
                ) : (
                  "+"
                )}
              </Button>
              {images[index] && (
                <Button
                  className="absolute top-1 right-1 h-8 w-8 p-0"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(index);
                  }}
                >
                  <DeleteIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
