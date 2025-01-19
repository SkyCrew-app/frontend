import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Book } from 'lucide-react';
import { ApolloError } from '@apollo/client';

interface CourseListItem {
  id: string;
  title: string;
  required_license: string;
}

interface CourseListProps {
  courses: CourseListItem[];
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string) => void;
  coursesLoading: boolean;
  coursesError: ApolloError | undefined;
}

export function CourseList({ courses, selectedCourseId, setSelectedCourseId, coursesLoading, coursesError }: CourseListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-1 p-2">
        {coursesLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))
        ) : coursesError ? (
          <p className="text-center py-4 text-red-500 dark:text-red-400">Erreur : {coursesError.message}</p>
        ) : (
          courses
            .sort((a, b) => parseInt(a.id) - parseInt(b.id))
            .map((course: CourseListItem) => (
              <Button
                key={course.id}
                variant={selectedCourseId === course.id ? "secondary" : "ghost"}
                className="w-full justify-start text-left px-1 flex items-center"
                onClick={() => setSelectedCourseId(course.id)}
              >
                <Book className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate flex-grow block max-w-[140px]">{course.title}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {course.required_license}
                </Badge>
              </Button>
            ))
        )}
      </div>
    </ScrollArea>
  );
}

