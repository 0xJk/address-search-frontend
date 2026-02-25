import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NearbySchoolsList from '@/components/NearbySchoolsList';

function makeSchool(overrides = {}) {
  return {
    school_name: 'Rose Bay Public School',
    school_type: 'Primary',
    school_sector: 'Government',
    suburb: 'ROSE BAY',
    distance_meters: 527,
    rating_overall: null,
    rating_academic: null,
    phone: null,
    website_url: null,
    ...overrides,
  };
}

describe('NearbySchoolsList', () => {
  it('renders suburb below school name', () => {
    render(<NearbySchoolsList schools={[makeSchool({ suburb: 'ROSE BAY' })]} />);
    expect(screen.getByText('ROSE BAY')).toBeInTheDocument();
  });

  it('does not render suburb when empty', () => {
    render(<NearbySchoolsList schools={[makeSchool({ suburb: '' })]} />);
    expect(screen.getByText('Rose Bay Public School')).toBeInTheDocument();
  });

  it('does not render suburb when null', () => {
    render(<NearbySchoolsList schools={[makeSchool({ suburb: null })]} />);
    expect(screen.getByText('Rose Bay Public School')).toBeInTheDocument();
  });
});
