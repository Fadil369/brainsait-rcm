/**
 * DocumentUpload Component
 * 
 * Drag-and-drop file upload with preview
 * Supports medical records, prescriptions, lab results
 */
'use client';

import { useState, useRef, DragEvent } from 'react';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
}

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };
  
  const handleFiles = (files: File[]) => {
    const newFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newFiles);
    onUpload(newFiles);
  };
  
  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUpload(newFiles);
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'picture_as_pdf';
    if (type.includes('word')) return 'description';
    return 'insert_drive_file';
  };
  
  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-input-light dark:border-input-dark hover:border-primary/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <span className="material-symbols-outlined text-4xl text-muted-light dark:text-muted-dark mb-2">
          cloud_upload
        </span>
        
        <p className="text-sm font-medium text-foreground-light dark:text-foreground-dark mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-muted-light dark:text-muted-dark">
          PDF, JPG, PNG, DOC up to 10MB
        </p>
      </div>
      
      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground-light dark:text-foreground-dark">
            Uploaded Files ({uploadedFiles.length})
          </p>
          
          {uploadedFiles.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-input-light dark:border-input-dark"
            >
              <span className="material-symbols-outlined text-primary">
                {getFileIcon(file.type)}
              </span>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-light dark:text-foreground-dark truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted-light dark:text-muted-dark">
                  {formatFileSize(file.size)}
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
