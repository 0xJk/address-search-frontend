'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AddressValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalAddress: string;
  correctedAddress: string;
  onSelectOriginal: () => void;
  onSelectCorrected: () => void;
}

export default function AddressValidationDialog({
  open,
  onOpenChange,
  originalAddress,
  correctedAddress,
  onSelectOriginal,
  onSelectCorrected,
}: AddressValidationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Did you mean?</DialogTitle>
          <DialogDescription>
            We found a match that may be more accurate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <button
            onClick={onSelectCorrected}
            className="w-full text-left p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:border-blue-400 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#1d4ed8' }}>Suggested address</span>
            </div>
            <p className="text-sm text-gray-900 pl-6">{correctedAddress}</p>
          </button>
          <button
            onClick={onSelectOriginal}
            className="w-full text-left p-4 rounded-lg border border-gray-200 bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Keep original</span>
            </div>
            <p className="text-sm text-gray-700 pl-6">{originalAddress}</p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
