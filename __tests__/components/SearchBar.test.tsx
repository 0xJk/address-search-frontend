import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchBar from '@/components/SearchBar';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock global google object (prevent autocomplete errors)
vi.stubGlobal('google', undefined);

// Mock fetch for /api/validate-address
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Full validation response factory
function makeValidationResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
      isValid: true,
      addressComplete: true,
      hasUnconfirmedComponents: false,
      hasInferredComponents: false,
      hasReplacedComponents: false,
      hasSpellCorrectedComponents: false,
      ...overrides,
    }),
  };
}

describe('SearchBar validation flow', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
  });

  it('calls validate-address API before navigating', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse());

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne VIC 3000');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/validate-address', expect.any(Object));
    });
  });

  it('navigates directly when valid and no corrections', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasReplacedComponents: false,
      hasSpellCorrectedComponents: false,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne VIC 3000');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/property?address=')
      );
    });
  });

  it('shows correction dialog when hasSpellCorrectedComponents is true', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasSpellCorrectedComponents: true,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smth Stret Melborne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Suggested address/i)).toBeInTheDocument();
    });
    // Should NOT navigate yet
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows correction dialog when hasReplacedComponents is true', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasReplacedComponents: true,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '999 Wrong Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Suggested address/i)).toBeInTheDocument();
    });
  });

  it('shows error when isValid is false', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      isValid: false,
      addressComplete: false,
      formattedAddress: null,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, 'asdfasdf');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/could not be validated/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows error when formattedAddress is null even if partially valid', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      isValid: false,
      addressComplete: false,
      formattedAddress: null,
      hasUnconfirmedComponents: true,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, 'partial addr');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/could not be validated/i)).toBeInTheDocument();
    });
  });

  it('fails open on network error — navigates with original address', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('fails open on non-OK response — navigates with original address', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('does not call API for empty input', async () => {
    render(<SearchBar variant="hero" />);
    await userEvent.click(screen.getByRole('button'));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('disables search button while validating', async () => {
    // Make fetch hang (never resolve)
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // --- Dialog selection → navigation ---
  it('navigates with corrected address when user selects "Suggested address"', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasSpellCorrectedComponents: true,
      formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smth Stret Melborne');
    await userEvent.click(screen.getByRole('button'));

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/Suggested address/i)).toBeInTheDocument();
    });

    // Click "Suggested address"
    await userEvent.click(screen.getByText(/Suggested address/i).closest('button')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('10 Smith Street, Melbourne VIC 3000, Australia'))
      );
    });
  });

  it('navigates with original address when user selects "Keep original"', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasReplacedComponents: true,
      formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '999 Wrong Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Keep original/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Keep original/i).closest('button')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('999 Wrong Street Melbourne'))
      );
    });
  });

  // --- Nav variant ---
  it('nav variant: validates and navigates on search', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse());

    render(<SearchBar variant="nav" />);
    const input = screen.getByPlaceholderText(/Search address/i);
    await userEvent.type(input, '10 Smith Street Melbourne VIC 3000');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/validate-address', expect.any(Object));
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/property?address=')
      );
    });
  });
});
