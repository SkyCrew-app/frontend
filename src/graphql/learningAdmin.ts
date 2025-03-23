import { gql } from '@apollo/client';

export const GET_COURSES = gql`
  query GetCourses($category: String, $search: String) {
    getCourses(category: $category, search: $search) {
      id
      title
      description
      category
      required_license
    }
  }
`;

export const CREATE_COURSE = gql`
  mutation CreateCourse($createCourseInput: CreateCourseDTO!) {
    createCourse(createCourseInput: $createCourseInput) {
      id
      title
      description
      category
      required_license
    }
  }
`;

export const GET_MODULES = gql`
  query GetAllModules {
    getAllModules {
      id
      title
      description
    }
  }
`;

export const CREATE_MODULE = gql`
  mutation CreateModule($createModuleInput: CreateModuleDTO!) {
    createModule(createModuleInput: $createModuleInput) {
      id
      title
      description
      course {
        id
        title
      }
    }
  }
`;

export const GET_LESSONS = gql`
  query GetLessons {
    getLessons {
      id
      title
      description
      video_url
      attachments
      module {
        id
        title
      }
    }
  }
`;

export const CREATE_LESSON = gql`
  mutation CreateLesson($createLessonInput: CreateLessonDTO!) {
    createLesson(createLessonInput: $createLessonInput) {
      id
      title
      description
      content
      video_url
      attachments
      module {
        id
        title
      }
    }
  }
`;

export const GET_MODULES_BY_COURSE = gql`
  query GetModulesByCourse($courseId: Float!) {
    getModulesByCourse(courseId: $courseId) {
      id
      title
      description
    }
  }
`;

export const GET_LESSONS_BY_MODULE = gql`
  query GetLessonsByModule($moduleId: Float!) {
    getLessonsByModule(moduleId: $moduleId) {
      id
      title
      description
      video_url
      attachments
    }
  }
`;

export const CREATE_EVALUATION = gql`
  mutation CreateEvaluation($createEvaluationInput: CreateEvaluationDTO!) {
    createEvaluation(createEvaluationInput: $createEvaluationInput) {
      id
      pass_score
      module {
        id
        title
      }
    }
  }
`;

export const CREATE_QUESTION = gql`
  mutation CreateQuestion($evaluationId: Float!, $createQuestionInput: CreateQuestionDTO!) {
    createQuestion(evaluationId: $evaluationId, createQuestionInput: $createQuestionInput) {
      id
      content
      options
      correct_answer
    }
  }
`;

export const GET_EVALUATIONS = gql`
  query GetEvaluations {
    getEvaluations {
      id
      pass_score
      module {
        id
        title
      }
      questions {
        id
        content
        options
        correct_answer
      }
    }
  }
`;

export const UPDATE_EVALUATION = gql`
  mutation UpdateEvaluation($updateEvaluationInput: UpdateEvaluationDTO!) {
    updateEvaluation(updateEvaluationInput: $updateEvaluationInput) {
      id
      pass_score
      module {
        id
        title
      }
    }
  }
`;

export const DELETE_EVALUATION = gql`
  mutation DeleteEvaluation($id: Float!) {
    deleteEvaluation(id: $id)
  }
`;

export const UPDATE_QUESTION = gql`
  mutation UpdateQuestion($updateQuestionInput: UpdateQuestionDTO!) {
    updateQuestion(updateQuestionInput: $updateQuestionInput) {
      id
      content
      options
      correct_answer
    }
  }
`;

export const DELETE_QUESTION = gql`
  mutation DeleteQuestion($id: Float!) {
    deleteQuestion(id: $id)
  }
`;

export const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: Float!, $updateCourseInput: UpdateCourseDTO!) {
    updateCourse(id: $id, updateCourseInput: $updateCourseInput) {
      id
      title
      category
      required_license
    }
  }
`;


export const DELETE_COURSE = gql`
  mutation DeleteCourse($id: Float!) {
    deleteCourse(id: $id)
  }
`;

export const UPDATE_MODULE = gql`
  mutation UpdateModule($id: Float!, $updateModuleInput: UpdateModuleDTO!) {
    updateModule(id: $id, updateModuleInput: $updateModuleInput) {
      id
      title
      description
    }
  }
`;

export const DELETE_MODULE = gql`
  mutation DeleteModule($id: Float!) {
    deleteModule(id: $id)
  }
`;

export const UPDATE_LESSON = gql`
  mutation UpdateLesson($updateLessonInput: UpdateLessonDTO!) {
    updateLesson(updateLessonInput: $updateLessonInput) {
      id
      title
      description
      content
      video_url
      attachments
      module {
        id
        title
      }
    }
  }
`;

export const DELETE_LESSON = gql`
  mutation DeleteLesson($id: Float!) {
    deleteLesson(id: $id)
  }
`;