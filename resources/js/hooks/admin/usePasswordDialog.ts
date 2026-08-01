import { useState } from 'react';

export function usePasswordDialog() {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  return {
    showPasswordDialog,
    openPasswordDialog: () => setShowPasswordDialog(true),
    closePasswordDialog: () => setShowPasswordDialog(false),
  };
}
