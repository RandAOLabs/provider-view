import React from 'react'
import { ConfirmationModal } from '../common/ConfirmationModal'

interface UnstakeProviderModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnstakeProviderModal: React.FC<UnstakeProviderModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      title="Confirm Unstaking"
      message={
        <div>
          <p>Are you sure you want to unstake your tokens?</p>
          <ul>
            <li>Your stake will be locked for a few days in an unstaking period</li>
            <li>You will need to return to this page to claim your tokens after the unstaking period ends</li>
            <li>Unstaking will make you <strong>ineligible for rewards</strong></li>
            <li>You will no longer be a provider once the unstaking process completes</li>
          </ul>
        </div>
      }
      confirmText="Unstake"
      cancelText="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};
