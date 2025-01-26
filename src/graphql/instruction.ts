import { gql } from '@apollo/client';

export const GET_COURSES = gql`
  query GetCourses($category: String, $search: String) {
    getCourses(category: $category, search: $search) {
      id
      title
      required_license
    }
  }
`;

export const GET_COURSE_DETAILS = gql`
  query GetCourseDetails($id: Float!, $userId: Float!) {
    getCourseById(id: $id, userId: $userId) {
      id
      title
      description
      category
      required_license
      modules {
        id
        title
        lessons {
          id
          title
        }
      }
    }
  }
`;

export const GET_LESSON_CONTENT = gql`
  query GetLessonContent($lessonId: Float!, $userId: Float!) {
    getLessonContent(lessonId: $lessonId, userId: $userId) {
      id
      title
      description
      video_url
      content
    }
  }
`;

export const MARK_LESSON_COMPLETED = gql`
  mutation MarkLessonCompleted($lessonId: Float!, $userId: Float!) {
    markLessonCompleted(lessonId: $lessonId, userId: $userId)
  }
`;

export const GET_COURSE_PROGRESS = gql`
  query GetCourseProgress($userId: Float!, $courseId: Float!) {
    getCourseProgress(userId: $userId, courseId: $courseId)
  }
`;