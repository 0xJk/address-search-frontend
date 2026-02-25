import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AddressValidationDialog from '@/components/AddressValidationDialog';

describe('AddressValidationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    originalAddress: '10 Smith St Melbourne',
    correctedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
    onSelectOriginal: vi.fn(),
    onSelectCorrected: vi.fn(),
  };

  it('renders both address options when open', () => {
    render(<AddressValidationDialog {...defaultProps} />);
    expect(screen.getByText('10 Smith St Melbourne')).toBeInTheDocument();
    expect(screen.getByText('10 Smith Street, Melbourne VIC 3000, Australia')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<AddressValidationDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('10 Smith St Melbourne')).not.toBeInTheDocument();
  });

  it('calls onSelectCorrected when clicking suggested address', async () => {
    const onSelectCorrected = vi.fn();
    render(<AddressValidationDialog {...defaultProps} onSelectCorrected={onSelectCorrected} />);

    await userEvent.click(screen.getByText(/Suggested address/i).closest('button')!);
    expect(onSelectCorrected).toHaveBeenCalledOnce();
  });

  it('calls onSelectOriginal when clicking keep original', async () => {
    const onSelectOriginal = vi.fn();
    render(<AddressValidationDialog {...defaultProps} onSelectOriginal={onSelectOriginal} />);

    await userEvent.click(screen.getByText(/Keep original/i).closest('button')!);
    expect(onSelectOriginal).toHaveBeenCalledOnce();
  });
});
