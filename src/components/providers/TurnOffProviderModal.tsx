import React from 'react'
import { ConfirmationModal } from '../common/ConfirmationModal'

interface TurnOffProviderModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TurnOffProviderModal: React.FC<TurnOffProviderModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      title="Turn Off Provider"
      message={
        <div>
          <p>Are you sure you want to turn off your provider?</p>
          <p>When you turn off your provider:</p>
          <ul>
            <li>You will stop receiving rewards as you will no longer be providing random values</li>
            <li>After all active random requests have been cleared from your node, you can safely turn off the docker container</li>
            <li>Your staked tokens will remain locked</li>
          </ul>
          <p>You can turn your provider back on at any time.</p>
        </div>
      }
      confirmText="Turn Off"
      cancelText="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};
