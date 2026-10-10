import { Exam } from '../src/models/Exam.js';
import { ExamAttempt } from '../src/models/ExamAttempt.js';

describe('Assessment Business Rules and Proctoring Logic', () => {
  test('calculates correct deadline based on duration in minutes', () => {
    const startedAt = new Date('2026-10-06T10:00:00Z');
    const durationMinutes = 60;
    const expectedEnd = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    expect(expectedEnd.toISOString()).toBe('2026-10-06T11:00:00.000Z');
  });

  test('correctly identifies expired deadline', () => {
    const deadline = new Date(Date.now() - 5000); // 5 seconds in past
    const isExpired = Date.now() > deadline.getTime();
    expect(isExpired).toBe(true);
  });

  test('computes dynamic exam status correctly for upcoming, active, and expired', () => {
    const now = new Date();

    const upcomingExam = new Exam({
      title: 'Upcoming Test',
      duration: 60,
      startDate: new Date(now.getTime() + 100000),
      endDate: new Date(now.getTime() + 200000),
      totalMarks: 100,
      passingMarks: 40,
      isPublished: true,
      createdBy: '507f1f77bcf86cd799439011',
    });
    expect(upcomingExam.getComputedStatus()).toBe('UPCOMING');

    const activeExam = new Exam({
      title: 'Active Test',
      duration: 60,
      startDate: new Date(now.getTime() - 100000),
      endDate: new Date(now.getTime() + 100000),
      totalMarks: 100,
      passingMarks: 40,
      isPublished: true,
      createdBy: '507f1f77bcf86cd799439011',
    });
    expect(activeExam.getComputedStatus()).toBe('ACTIVE');

    const expiredExam = new Exam({
      title: 'Expired Test',
      duration: 60,
      startDate: new Date(now.getTime() - 200000),
      endDate: new Date(now.getTime() - 100000),
      totalMarks: 100,
      passingMarks: 40,
      isPublished: true,
      createdBy: '507f1f77bcf86cd799439011',
    });
    expect(expiredExam.getComputedStatus()).toBe('EXPIRED');
  });
});
