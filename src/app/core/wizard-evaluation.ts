import type { ExamParticipant, GradeThreshold, WizardData } from './wizard.models';

export type AdjustmentTrend = 'better' | 'worse' | 'same';

export type GradeAssessment = {
  grade: string;
  failed: boolean;
  rank: number;
};

export type GradeDescriptor = {
  grade: string;
  failed: boolean;
  rank: number;
};

export type ParticipantReviewRow = {
  name: string;
  rawPoints: number;
  rawPercent: number;
  rawGrade: string;
  rawFailed: boolean;
  adjustedPoints: number;
  adjustedPercent: number;
  adjustedGrade: string;
  adjustedFailed: boolean;
  adjustedRank: number;
  trend: AdjustmentTrend;
};

export type GradeReviewGroup = {
  key: string;
  grade: string;
  failed: boolean;
  rank: number;
  averageAdjustedPercent: number;
  rows: ParticipantReviewRow[];
};

export type StatusReviewGroup = {
  key: 'passed' | 'failed';
  title: string;
  failed: boolean;
  participantCount: number;
  percent: number;
  gradeGroups: GradeReviewGroup[];
};

export type GradeDistributionRow = {
  grade: string;
  failed: boolean;
  raw: number;
  adjusted: number;
};

export type FailureComparison = {
  participantCount: number;
  rawCount: number;
  rawPercent: number;
  adjustedCount: number;
  adjustedPercent: number;
  deltaCount: number;
  deltaPercentPoints: number;
};

export type AdjustmentEvaluation = {
  rawTotalPoints: number;
  adjustedTotalPoints: number;
  changedAdjustedMaxPointsCount: number;
  changedThresholdCount: number;
  adjustmentSummary: string;
  reviewRows: ParticipantReviewRow[];
  failureComparison: FailureComparison;
  gradeDistributionRows: GradeDistributionRow[];
  groupedReviewRows: GradeReviewGroup[];
  groupedStatusReviewRows: StatusReviewGroup[];
};

const collator = new Intl.Collator('de-DE', {
  numeric: true,
  sensitivity: 'base'
});

function displayText(value: string): string {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : '—';
}

function calculateRawTotalPoints(data: WizardData): number {
  return data.aufgaben.tasks.reduce((sum, task) => sum + (task.maxPoints ?? 0), 0);
}

function adjustedMaxPointsForTask(data: WizardData, index: number): number {
  const maxPoints = data.justierung.adjustedMaxPointsByTask[index];

  return typeof maxPoints === 'number' && Number.isFinite(maxPoints) && maxPoints >= 0 ? maxPoints : 0;
}

function calculateAdjustedTotalPoints(data: WizardData): number {
  return data.aufgaben.tasks.reduce((sum, _, index) => {
    if (data.justierung.droppedTaskIndexes.includes(index)) {
      return sum;
    }

    return sum + adjustedMaxPointsForTask(data, index);
  }, 0);
}

function calculateRawPoints(data: WizardData, participant: ExamParticipant): number {
  return data.aufgaben.tasks.reduce((sum, _, taskIndex) => sum + (participant.pointsByTask[taskIndex] ?? 0), 0);
}

function calculateAdjustedPoints(data: WizardData, participant: ExamParticipant): number {
  return data.aufgaben.tasks.reduce((sum, task, taskIndex) => {
    if (data.justierung.droppedTaskIndexes.includes(taskIndex)) {
      return sum;
    }

    const originalMaxPoints = task.maxPoints ?? 0;
    const adjustedMaxPoints = adjustedMaxPointsForTask(data, taskIndex);
    const participantPoints = participant.pointsByTask[taskIndex] ?? 0;

    if (originalMaxPoints <= 0) {
      return sum;
    }

    return sum + (participantPoints / originalMaxPoints) * adjustedMaxPoints;
  }, 0);
}

function calculatePercent(points: number, totalPoints: number): number {
  if (totalPoints <= 0) {
    return 0;
  }

  return (points / totalPoints) * 100;
}

function createGradeDescriptors(gradeThresholds: GradeThreshold[]): GradeDescriptor[] {
  const descriptors: GradeDescriptor[] = [];

  gradeThresholds.forEach((threshold) => {
    const grade = displayText(threshold.grade);

    if (descriptors.some((descriptor) => descriptor.grade === grade)) {
      return;
    }

    descriptors.push({
      grade,
      failed: threshold.failed,
      rank: descriptors.length
    });
  });

  return descriptors;
}

function assessGradeForPercent(
  percent: number,
  gradeThresholds: GradeThreshold[],
  gradeLabels: string[]
): GradeAssessment {
  const threshold = gradeThresholds
    .filter((item) => item.minPercent !== null)
    .sort((left, right) => (right.minPercent ?? 0) - (left.minPercent ?? 0))
    .find((item) => percent >= (item.minPercent ?? 0));

  if (!threshold) {
    return {
      grade: '—',
      failed: false,
      rank: Number.POSITIVE_INFINITY
    };
  }

  const grade = displayText(threshold.grade);
  const rank = gradeLabels.indexOf(grade);

  return {
    grade,
    failed: threshold.failed,
    rank: rank >= 0 ? rank : Number.POSITIVE_INFINITY
  };
}

function trendForAssessments(rawAssessment: GradeAssessment, adjustedAssessment: GradeAssessment): AdjustmentTrend {
  if (rawAssessment.failed !== adjustedAssessment.failed) {
    return adjustedAssessment.failed ? 'worse' : 'better';
  }

  if (
    !Number.isFinite(rawAssessment.rank) ||
    !Number.isFinite(adjustedAssessment.rank) ||
    rawAssessment.rank === adjustedAssessment.rank
  ) {
    return 'same';
  }

  return adjustedAssessment.rank < rawAssessment.rank ? 'better' : 'worse';
}

function createReviewRows(
  data: WizardData,
  rawTotalPoints: number,
  adjustedTotalPoints: number,
  gradeLabels: string[]
): ParticipantReviewRow[] {
  return data.teilnehmer.participants.map((participant, index) => {
    const rawPoints = calculateRawPoints(data, participant);
    const rawPercent = calculatePercent(rawPoints, rawTotalPoints);
    const rawAssessment = assessGradeForPercent(rawPercent, data.notenschema.gradeThresholds, gradeLabels);
    const adjustedPoints = calculateAdjustedPoints(data, participant);
    const adjustedPercent = calculatePercent(adjustedPoints, adjustedTotalPoints);
    const adjustedAssessment = assessGradeForPercent(adjustedPercent, data.justierung.gradeThresholds, gradeLabels);

    return {
      name: displayText(participant.name) === '—' ? `Teilnehmer ${index + 1}` : displayText(participant.name),
      rawPoints,
      rawPercent,
      rawGrade: rawAssessment.grade,
      rawFailed: rawAssessment.failed,
      adjustedPoints,
      adjustedPercent,
      adjustedGrade: adjustedAssessment.grade,
      adjustedFailed: adjustedAssessment.failed,
      adjustedRank: adjustedAssessment.rank,
      trend: trendForAssessments(rawAssessment, adjustedAssessment)
    };
  });
}

function compareRanks(left: number, right: number): number {
  if (Number.isFinite(left) && Number.isFinite(right)) {
    return left - right;
  }

  if (Number.isFinite(left)) {
    return -1;
  }

  if (Number.isFinite(right)) {
    return 1;
  }

  return 0;
}

function compareReviewRows(left: ParticipantReviewRow, right: ParticipantReviewRow): number {
  const rankComparison = compareRanks(left.adjustedRank, right.adjustedRank);

  if (rankComparison !== 0) {
    return rankComparison;
  }

  const adjustedPercentComparison = right.adjustedPercent - left.adjustedPercent;

  if (adjustedPercentComparison !== 0) {
    return adjustedPercentComparison;
  }

  const rawPercentComparison = right.rawPercent - left.rawPercent;

  if (rawPercentComparison !== 0) {
    return rawPercentComparison;
  }

  return collator.compare(left.name, right.name);
}

function calculateAverageAdjustedPercent(rows: ParticipantReviewRow[]): number {
  if (rows.length === 0) {
    return 0;
  }

  return rows.reduce((sum, row) => sum + row.adjustedPercent, 0) / rows.length;
}

function createGroupedReviewRows(reviewRows: ParticipantReviewRow[]): GradeReviewGroup[] {
  const groups = new Map<string, Omit<GradeReviewGroup, 'averageAdjustedPercent'>>();

  reviewRows.forEach((row) => {
    const key = `${row.adjustedRank}:${row.adjustedGrade}:${row.adjustedFailed}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        grade: row.adjustedGrade,
        failed: row.adjustedFailed,
        rank: row.adjustedRank,
        rows: []
      });
    }

    groups.get(key)!.rows.push(row);
  });

  return [...groups.values()]
    .map((group) => {
      const rows = [...group.rows].sort(compareReviewRows);

      return {
        ...group,
        rows,
        averageAdjustedPercent: calculateAverageAdjustedPercent(rows)
      };
    })
    .sort((left, right) => {
      const rankComparison = compareRanks(left.rank, right.rank);

      return rankComparison !== 0 ? rankComparison : collator.compare(left.grade, right.grade);
    });
}

function createStatusReviewGroup(
  key: StatusReviewGroup['key'],
  title: string,
  failed: boolean,
  totalParticipantCount: number,
  gradeGroups: GradeReviewGroup[]
): StatusReviewGroup {
  const participantCount = gradeGroups.reduce((sum, group) => sum + group.rows.length, 0);

  return {
    key,
    title,
    failed,
    participantCount,
    percent: calculatePercent(participantCount, totalParticipantCount),
    gradeGroups
  };
}

function createGroupedStatusReviewRows(reviewRows: ParticipantReviewRow[], gradeGroups: GradeReviewGroup[]): StatusReviewGroup[] {
  const participantCount = reviewRows.length;
  const passedGradeGroups = gradeGroups.filter((group) => !group.failed);
  const failedGradeGroups = gradeGroups.filter((group) => group.failed);

  return [
    createStatusReviewGroup('passed', 'Bestanden', false, participantCount, passedGradeGroups),
    createStatusReviewGroup('failed', 'Durchgefallen', true, participantCount, failedGradeGroups)
  ];
}

function createFailureComparison(reviewRows: ParticipantReviewRow[]): FailureComparison {
  const participantCount = reviewRows.length;
  const rawCount = reviewRows.filter((row) => row.rawFailed).length;
  const adjustedCount = reviewRows.filter((row) => row.adjustedFailed).length;
  const rawPercent = calculatePercent(rawCount, participantCount);
  const adjustedPercent = calculatePercent(adjustedCount, participantCount);

  return {
    participantCount,
    rawCount,
    rawPercent,
    adjustedCount,
    adjustedPercent,
    deltaCount: adjustedCount - rawCount,
    deltaPercentPoints: adjustedPercent - rawPercent
  };
}

function createGradeDistributionRows(
  gradeDescriptors: GradeDescriptor[],
  reviewRows: ParticipantReviewRow[]
): GradeDistributionRow[] {
  const rows = new Map<string, GradeDistributionRow>();

  gradeDescriptors.forEach((descriptor) => {
    rows.set(descriptor.grade, {
      grade: descriptor.grade,
      failed: descriptor.failed,
      raw: 0,
      adjusted: 0
    });
  });

  reviewRows.forEach((row) => {
    if (!rows.has(row.rawGrade)) {
      rows.set(row.rawGrade, {
        grade: row.rawGrade,
        failed: row.rawFailed,
        raw: 0,
        adjusted: 0
      });
    }

    if (!rows.has(row.adjustedGrade)) {
      rows.set(row.adjustedGrade, {
        grade: row.adjustedGrade,
        failed: row.adjustedFailed,
        raw: 0,
        adjusted: 0
      });
    }

    rows.get(row.rawGrade)!.raw += 1;
    rows.get(row.adjustedGrade)!.adjusted += 1;
  });

  return [...rows.values()];
}

function createAdjustmentSummary(data: WizardData, changedAdjustedMaxPointsCount: number, changedThresholdCount: number): string {
  const adjustments: string[] = [];

  if (data.justierung.droppedTaskIndexes.length > 0) {
    adjustments.push(`${data.justierung.droppedTaskIndexes.length} Aufgabe(n) gestrichen`);
  }

  if (changedAdjustedMaxPointsCount > 0) {
    adjustments.push(`${changedAdjustedMaxPointsCount} Aufgabenpunktzahl(en) angepasst`);
  }

  if (changedThresholdCount > 0) {
    adjustments.push(`${changedThresholdCount} Schwelle(n) angepasst`);
  }

  return adjustments.length > 0
    ? adjustments.join(' · ')
    : 'Noch keine rechnerische Justierung aktiv.';
}

function countChangedAdjustedMaxPoints(data: WizardData): number {
  return data.aufgaben.tasks.filter((task, index) => data.justierung.adjustedMaxPointsByTask[index] !== task.maxPoints).length;
}

function countChangedThresholds(data: WizardData): number {
  return data.notenschema.gradeThresholds.filter((threshold, index) => {
    const adjustedThreshold = data.justierung.gradeThresholds[index];

    return adjustedThreshold !== undefined && adjustedThreshold.minPercent !== threshold.minPercent;
  }).length;
}

export function createAdjustmentEvaluation(data: WizardData): AdjustmentEvaluation {
  const rawTotalPoints = calculateRawTotalPoints(data);
  const adjustedTotalPoints = calculateAdjustedTotalPoints(data);
  const gradeDescriptors = createGradeDescriptors(data.notenschema.gradeThresholds);
  const gradeLabels = gradeDescriptors.map((descriptor) => descriptor.grade);
  const reviewRows = createReviewRows(data, rawTotalPoints, adjustedTotalPoints, gradeLabels);
  const groupedReviewRows = createGroupedReviewRows(reviewRows);
  const changedAdjustedMaxPointsCount = countChangedAdjustedMaxPoints(data);
  const changedThresholdCount = countChangedThresholds(data);

  return {
    rawTotalPoints,
    adjustedTotalPoints,
    changedAdjustedMaxPointsCount,
    changedThresholdCount,
    adjustmentSummary: createAdjustmentSummary(data, changedAdjustedMaxPointsCount, changedThresholdCount),
    reviewRows,
    failureComparison: createFailureComparison(reviewRows),
    gradeDistributionRows: createGradeDistributionRows(gradeDescriptors, reviewRows),
    groupedReviewRows,
    groupedStatusReviewRows: createGroupedStatusReviewRows(reviewRows, groupedReviewRows)
  };
}
