import { render, screen, fireEvent, within } from '@testing-library/react';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { MetricsSummaryCard } from '@/features/metrics/components/MetricsSummaryCard';
import { ActiveMajorsBreakdownModal } from '@/features/metrics/components/ActiveMajorsBreakdownModal';
import { AnalyticsBreakdownModal } from '@/features/metrics/components/AnalyticsBreakdownModal';
import { SchoolsBreakdownModal } from '@/features/metrics/components/SchoolsBreakdownModal';
import { Users } from 'lucide-react';

describe('analytics header and stat card', () => {
  test('renders header content', () => {
    render(<DashboardHeader />);
    expect(screen.getByText('OUS Analytics')).toBeInTheDocument();
    expect(
      screen.getByText('Howard University OUS Office')
    ).toBeInTheDocument();
  });

  test('stat card handles change states and click interactions', () => {
    const handleClick = jest.fn();
    const { rerender } = render(
      <MetricsSummaryCard
        title="Total Students"
        value={1234}
        icon={Users}
        description="Current data"
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);

    rerender(
      <MetricsSummaryCard
        title="Change Up"
        value="N/A"
        icon={Users}
        change={5}
      />
    );
    expect(screen.getByText('5.0%')).toBeInTheDocument();

    rerender(
      <MetricsSummaryCard
        title="Change Down"
        value={500}
        icon={Users}
        change={-2.5}
      />
    );
    expect(screen.getByText('2.5%')).toBeInTheDocument();

    rerender(
      <MetricsSummaryCard title="No Change" value={0} icon={Users} change={0} />
    );
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  test('breakdown modal renders metrics', () => {
    render(
      <AnalyticsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        dateLabel="Jan 1, 2024"
        data={{
          total: 1000,
          undergrad: 900,
        }}
        undergraduateBreakdown={[
          {
            studentType: 'FTIC',
            total: 400,
            international: 120,
            nonInternational: 280,
          },
          {
            studentType: 'Transfer',
            total: 200,
            international: 20,
            nonInternational: 180,
          },
          {
            studentType: 'Continuing',
            total: 300,
            international: 10,
            nonInternational: 290,
          },
        ]}
        undergraduateBreakdownInsights={[
          {
            studentType: 'FTIC',
            total: 400,
            shareOfUndergradPct: 44.4,
            international: 120,
            nonInternational: 280,
            avgCumulativeGPA: 3.1,
            avgCumulativeCreditsEarned: 18.4,
            topMajors: [
              { label: 'Biology', count: 120, pctOfGroup: 30 },
              { label: 'Computer Science', count: 90, pctOfGroup: 22.5 },
            ],
            topSchools: [
              {
                label: 'College of Arts & Sciences',
                count: 180,
                pctOfGroup: 45,
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('Student Breakdown')).toBeInTheDocument();
    expect(
      screen.queryByText('Undergraduate Students')
    ).not.toBeInTheDocument();
    expect(screen.getByText('FTIC Students')).toBeInTheDocument();
    expect(screen.getByText('International: 120')).toBeInTheDocument();
    expect(screen.getByText(/Top majors: Biology/)).toBeInTheDocument();
  });

  test('breakdown modal uses safe fallbacks when insights are missing and undergrad is zero', () => {
    render(
      <AnalyticsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        dateLabel="Jan 1, 2024"
        data={{
          total: 20,
          undergrad: 0,
        }}
        undergraduateBreakdown={[
          {
            studentType: 'FTIC',
            total: 20,
            international: 5,
            nonInternational: 15,
          },
        ]}
        undergraduateBreakdownInsights={[]}
      />
    );

    expect(
      screen.getAllByText('0.0% of undergraduate total').length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Top majors: N/A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Top schools: N/A').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Avg cumulative GPA: N/A').length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Other Undergraduate')).not.toBeInTheDocument();
  });

  test('active majors breakdown modal renders insight sections', () => {
    render(
      <ActiveMajorsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        activeMajors={3}
        dateLabel="Jan 1, 2024"
        activeMajorInsights={[
          {
            major: 'Computer Science',
            total: 80,
            shareOfActivePct: 40,
            international: 4,
            nonInternational: 76,
            internationalPct: 5,
            avgCumulativeGPA: 3.12,
            avgCumulativeCreditsEarned: 61.2,
            topSchools: [
              { label: 'College of Engineering', count: 80, pctOfGroup: 100 },
            ],
            studentTypeMix: [
              { label: 'Continuing', count: 70, pctOfGroup: 87.5 },
            ],
          },
          {
            major: 'Biology',
            total: 60,
            shareOfActivePct: 30,
            international: 3,
            nonInternational: 57,
            internationalPct: 5,
            avgCumulativeGPA: 3.01,
            avgCumulativeCreditsEarned: 59.4,
            topSchools: [
              {
                label: 'College of Arts & Sciences',
                count: 60,
                pctOfGroup: 100,
              },
            ],
            studentTypeMix: [
              { label: 'Transfer', count: 20, pctOfGroup: 33.3 },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('Active Majors Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Top Active Majors')).toBeInTheDocument();
    expect(screen.getAllByText('Computer Science').length).toBeGreaterThan(0);
    expect(screen.getByText(/Top 3 majors account for/)).toBeInTheDocument();
  });

  test('active majors breakdown modal handles empty and tie-case insights', () => {
    const { rerender } = render(
      <ActiveMajorsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        activeMajors={0}
        dateLabel="Jan 1, 2024"
        activeMajorInsights={[]}
      />
    );

    expect(
      screen.getByText('No active-major insight data is available.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('No majors with at least 20 active students to display.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Top 3 majors account for 0.0% of active undergraduate major/
      )
    ).toBeInTheDocument();

    rerender(
      <ActiveMajorsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        activeMajors={3}
        dateLabel="Jan 1, 2024"
        activeMajorInsights={[
          {
            major: 'Business',
            total: 30,
            shareOfActivePct: 30,
            international: 3,
            nonInternational: 27,
            internationalPct: 10,
            avgCumulativeGPA: 3.0,
            avgCumulativeCreditsEarned: 60,
            topSchools: [],
            studentTypeMix: [],
          },
          {
            major: 'Art',
            total: 30,
            shareOfActivePct: 30,
            international: 6,
            nonInternational: 24,
            internationalPct: 25,
            avgCumulativeGPA: 3.1,
            avgCumulativeCreditsEarned: 61,
            topSchools: [],
            studentTypeMix: [],
          },
          {
            major: 'Zoology',
            total: 25,
            shareOfActivePct: 25,
            international: 5,
            nonInternational: 20,
            internationalPct: 25,
            avgCumulativeGPA: 3.2,
            avgCumulativeCreditsEarned: 62,
            topSchools: [],
            studentTypeMix: [],
          },
        ]}
      />
    );

    const topMajorsSection = screen
      .getByText('Top Active Majors')
      .closest('div') as HTMLElement;
    const topMajors = within(topMajorsSection).getAllByText(
      /^(Art|Business|Zoology)$/
    );
    expect(topMajors[0]).toHaveTextContent('Art');
    expect(topMajors[1]).toHaveTextContent('Business');

    const intlSection = screen
      .getByText('International Spotlight')
      .closest('div') as HTMLElement;
    const intlMajors = within(intlSection).getAllByText(/^(Art|Zoology)$/);
    expect(intlMajors[0]).toHaveTextContent('Art');
    expect(intlMajors[1]).toHaveTextContent('Zoology');
  });

  test('schools breakdown modal renders school cards', () => {
    render(
      <SchoolsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        activeSchools={2}
        dateLabel="Jan 1, 2024"
        schoolInsights={[
          {
            school: 'College of Arts & Sciences',
            total: 300,
            shareOfUndergradPct: 45,
            international: 8,
            nonInternational: 292,
            internationalPct: 2.7,
            avgCumulativeGPA: 3.02,
            avgCumulativeCreditsEarned: 62.1,
            activeMajorsCount: 20,
            topMajors: [{ label: 'Biology', count: 50, pctOfGroup: 16.7 }],
            studentTypeMix: [
              { label: 'Continuing', count: 290, pctOfGroup: 96.7 },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('Schools/Colleges Breakdown')).toBeInTheDocument();
    expect(screen.getByText('College of Arts & Sciences')).toBeInTheDocument();
    expect(screen.getByText(/Active majors: 20/)).toBeInTheDocument();
    expect(screen.getByText(/Top major: Biology/)).toBeInTheDocument();
  });

  test('schools breakdown modal handles empty states, sorting ties, and top-major fallbacks', () => {
    const { rerender } = render(
      <SchoolsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        activeSchools={0}
        dateLabel="Jan 1, 2024"
        schoolInsights={[]}
      />
    );

    expect(
      screen.getByText('No school-level insight data is available.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Showing the top 0 schools by undergraduate/)
    ).toBeInTheDocument();

    rerender(
      <SchoolsBreakdownModal
        open={true}
        onOpenChange={jest.fn()}
        activeSchools={3}
        dateLabel="Jan 1, 2024"
        schoolInsights={[
          {
            school: 'School Z',
            total: 100,
            shareOfUndergradPct: 40,
            international: 5,
            nonInternational: 95,
            internationalPct: 5,
            avgCumulativeGPA: 3.2,
            avgCumulativeCreditsEarned: 60,
            activeMajorsCount: 10,
            topMajors: [],
            studentTypeMix: [],
          },
          {
            school: 'School A',
            total: 100,
            shareOfUndergradPct: 40,
            international: 6,
            nonInternational: 94,
            internationalPct: 6,
            avgCumulativeGPA: 3.1,
            avgCumulativeCreditsEarned: 59,
            activeMajorsCount: 9,
            topMajors: [{ label: 'Biology', count: 20, pctOfGroup: 20 }],
            studentTypeMix: [],
          },
          {
            school: 'School B',
            total: 80,
            shareOfUndergradPct: 20,
            international: 4,
            nonInternational: 76,
            internationalPct: 5,
            avgCumulativeGPA: 3.0,
            avgCumulativeCreditsEarned: 58,
            activeMajorsCount: 8,
            topMajors: [{ label: 'Chemistry', count: 10, pctOfGroup: 12.5 }],
            studentTypeMix: [],
          },
        ]}
      />
    );

    const orderedSchools = screen.getAllByText(/^School [ABZ]$/);
    expect(orderedSchools[0]).toHaveTextContent('School A');
    expect(orderedSchools[1]).toHaveTextContent('School Z');
    expect(screen.getByText('Top major: N/A')).toBeInTheDocument();
  });
});
