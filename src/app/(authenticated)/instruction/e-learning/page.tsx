'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { GET_COURSES, GET_COURSE_DETAILS, GET_LESSON_CONTENT, GET_COURSE_PROGRESS } from '@/graphql/instruction';
import { CourseSearch } from '@/components/e-learning/CourseSearch';
import { CourseList } from '@/components/e-learning/CourseList';
import { CourseDetails, Lesson as CourseDetailsLesson } from '@/components/e-learning/CourseDetails';
import { LessonContent } from '@/components/e-learning/LessonContent';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Menu } from 'lucide-react';
import { useDecodedToken, useUserData } from '@/components/hooks/userHooks';

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url?: string;
  content: {
    title: string;
    sections: {
      heading: string;
      body: string;
    }[];
  };
}

interface Course {
  id: string;
  title: string;
  description: string;
  required_license: string;
  modules: {
    id: string;
    title: string;
    lessons: Lesson[];
  }[];
}

export default function ELearningPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [courseProgress, setCourseProgress] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userEmail = useDecodedToken();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const { data: coursesData, loading: coursesLoading, error: coursesError, refetch: refetchCourses } = useQuery(GET_COURSES, {
    variables: {
      category: category === 'all' ? null : category,
      search: searchTerm
    },
    fetchPolicy: 'network-only',
  });

  const { data: courseData, loading: courseLoading, error: courseError } = useQuery(GET_COURSE_DETAILS, {
    variables: { id: selectedCourseId ? parseFloat(selectedCourseId) : null, userId },
    skip: !selectedCourseId,
  });

  const { data: lessonData, loading: lessonLoading, error: lessonError } = useQuery(GET_LESSON_CONTENT, {
    variables: { lessonId: selectedLesson?.id, userId },
    skip: !selectedLesson,
  });

  const { data: progressData, loading: progressLoading, error: progressError } = useQuery(GET_COURSE_PROGRESS, {
    variables: { userId, courseId: selectedCourseId ? parseFloat(selectedCourseId) : null },
    skip: !selectedCourseId,
  });

  useEffect(() => {
    if (progressData && progressData.getCourseProgress) {
      setCourseProgress(progressData.getCourseProgress);
    }
  }, [progressData]);

  const handleSetCategory = useCallback((newCategory: string) => {
    setCategory(newCategory);
  }, []);

  const handleSetSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  useEffect(() => {
    refetchCourses({
      category: category === 'all' ? null : category,
      search: searchTerm
    });
  }, [category, searchTerm, refetchCourses]);

  const courses = coursesData?.getCourses || [];
  const course = courseData?.getCourseById as Course | undefined;
  const lessonContent = lessonData?.getLessonContent as Lesson | undefined;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={`bg-white dark:bg-gray-800 w-64 min-h-screen flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-30`}>
        <div className="p-4">
          <CourseSearch
            searchTerm={searchTerm}
            setSearchTerm={handleSetSearchTerm}
            category={category}
            setCategory={handleSetCategory}
          />
        </div>
        <div className="flex-grow overflow-y-auto">
          <CourseList
            courses={courses}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            coursesLoading={coursesLoading}
            coursesError={coursesError}
          />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden absolute top-4 left-4 z-50"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 h-screen">
          <div className="container mx-auto px-4">
            {courseLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : courseError ? (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-4 rounded-lg">
                Erreur : {courseError.message}
              </div>
            ) : course ? (
              <div className="space-y-8">
                <CourseDetails
                  course={course}
                  courseProgress={courseProgress}
                  progressLoading={progressLoading}
                  progressError={progressError}
                  setSelectedLesson={(lesson: CourseDetailsLesson) => setSelectedLesson(lesson as Lesson)}
                />
                {selectedLesson && (
                  <LessonContent
                    lesson={lessonContent}
                    courseId={selectedCourseId || ''}
                    lessonLoading={lessonLoading}
                    lessonError={lessonError ? { message: lessonError.message } : null}
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-gray-600 dark:text-gray-400">
                <p className="text-xl">Sélectionnez un cours pour commencer</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

