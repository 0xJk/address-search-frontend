import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimilarPropertiesGrid from '@/components/SimilarPropertiesGrid';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function makeProperty(overrides = {}) {
  return {
    address: '1A CALEDONIAN ROAD ROSE BAY NSW',
    suburb: 'ROSE BAY',
    distance_meters: 77,
    sale_date: '2025-12-08',
    sale_price: 1925000,
    sale_method: 'Private Sale',
    bedrooms: 2,
    bathrooms: 1,
    car_spaces: null,
    land_area: null,
    building_area: null,
    property_type: 'Apartment',
    ...overrides,
  };
}

describe('SimilarPropertiesGrid', () => {
  it('renders suburb below address', () => {
    render(<SimilarPropertiesGrid properties={[makeProperty({ suburb: 'ROSE BAY' })]} />);
    expect(screen.getByText('ROSE BAY')).toBeInTheDocument();
  });

  it('does not render suburb when empty', () => {
    render(<SimilarPropertiesGrid properties={[makeProperty({ suburb: '' })]} />);
    expect(screen.getByText('1A CALEDONIAN ROAD ROSE BAY NSW')).toBeInTheDocument();
    expect(screen.queryByText(/^ROSE BAY$/)).not.toBeInTheDocument();
  });

  it('does not render suburb when null', () => {
    render(<SimilarPropertiesGrid properties={[makeProperty({ suburb: null })]} />);
    expect(screen.getByText('1A CALEDONIAN ROAD ROSE BAY NSW')).toBeInTheDocument();
  });
});
