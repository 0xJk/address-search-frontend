import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PropertyInfoCard from '@/components/PropertyInfoCard';

// Factory for minimal valid PropertyInfo
function makePropertyInfo(overrides = {}) {
  return {
    address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    standardized_address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    suburb: 'ROSE BAY',
    state: 'NSW',
    postcode: '2029',
    property_type: 'Apartment',
    land_area: null,
    building_area: null,
    year_built: '',
    zoning: null,
    metro_classification: 'Sydney Metro',
    geocode_source: 'CACHED',
    latitude: -33.868,
    longitude: 151.269,
    gnaf_pid: 'GANSW710421086',
    gnaf_matched: true,
    gnaf_warning: null,
    ...overrides,
  };
}

describe('PropertyInfoCard', () => {
  // Existing fields should still render
  it('renders standardized address in header', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo()} />);
    expect(screen.getByText('746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029')).toBeInTheDocument();
  });

  // --- NEW: GNAF PID ---
  it('renders GNAF PID when present', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_pid: 'GANSW710421086' })} />);
    expect(screen.getByText('GNAF PID')).toBeInTheDocument();
    expect(screen.getByText('GANSW710421086')).toBeInTheDocument();
  });

  it('renders dash for null GNAF PID', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_pid: null })} />);
    const pidLabel = screen.getByText('GNAF PID');
    expect(pidLabel).toBeInTheDocument();
    // The InfoRow renders "\u2014" for null values \u2014 verify in the same row
    const row = pidLabel.closest('div');
    expect(row).toHaveTextContent('\u2014');
  });

  // --- NEW: GNAF Matched ---
  it('renders "Yes" when gnaf_matched is true', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_matched: true })} />);
    expect(screen.getByText('GNAF Matched')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('renders "No" when gnaf_matched is false', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_matched: false })} />);
    expect(screen.getByText('GNAF Matched')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  // --- NEW: GNAF Warning ---
  it('shows warning banner when gnaf_warning is set', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_warning: 'Unit-level match only' })} />);
    expect(screen.getByText('Unit-level match only')).toBeInTheDocument();
  });

  it('does not show warning banner when gnaf_warning is null', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_warning: null })} />);
    expect(screen.queryByText('Unit-level match only')).not.toBeInTheDocument();
  });

  // --- NEW: Original address subtitle ---
  it('shows original address when different from standardized', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({
      address: '3/746 New South Head Road Rose Bay NSW 2029',
      standardized_address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    })} />);
    expect(screen.getByText(/3\/746 New South Head Road/)).toBeInTheDocument();
  });

  it('does not show original address when same as standardized', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({
      address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
      standardized_address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    })} />);
    // Should only appear once (in header), not as a subtitle
    const matches = screen.getAllByText('746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029');
    expect(matches.length).toBe(1);
  });
});
