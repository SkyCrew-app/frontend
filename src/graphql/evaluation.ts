import { gql } from '@apollo/client';

// Query to get all evaluations
export const GET_EVALUATIONS = gql`
  query GetEvaluations {
    getEvaluations {
      id
      module {
        id
        title
      }
      pass_score
    }
  }
`;

// Query to get a specific evaluation by ID
export const GET_EVALUATION_BY_ID = gql`
  query GetEvaluationById($id: Float!) {
    getEvaluationById(id: $id) {
      id
      module {
        id
        title
      }
      pass_score
      questions {
        id
        content
        options
      }
    }
  }
`;

// Mutation to create an evaluation
export const CREATE_EVALUATION = gql`
  mutation CreateEvaluation($createEvaluationInput: CreateEvaluationDTO!) {
    createEvaluation(createEvaluationInput: $createEvaluationInput) {
      id
      module {
        id
        title
      }
      pass_score
    }
  }
`;

// Mutation to validate answers for an evaluation
export const VALIDATE_ANSWERS = gql`
  mutation ValidateAnswers($evaluationId: Float!, $userId: Float!, $userAnswers: [UserAnswerInput!]!) {
    validateAnswers(evaluationId: $evaluationId, userId: $userId, userAnswers: $userAnswers) {
      score
      passed
    }
  }
`;

export const GET_EVALUATIONS_BY_MODULE = gql`
  query GetEvaluationsByModule($moduleId: Float!) {
    getEvaluationsByModule(moduleId: $moduleId) {
      id
      pass_score
    }
  }
`;

export const GET_USER_EVALUATION_RESULTS = gql`
  query GetUserEvaluationResults($userId: Float!) {
    getUserEvaluationResults(userId: $userId) {
      id
      score
      passed
      completed_at
      evaluation {
        id
        pass_score
        module {
          id
          title
          description
        }
      }
    }
  }
`;

export const GET_USER_INSTRUCTION_SUMMARY = gql`
  query GetUserInstructionSummary($userId: Int!) {
    getUserInstructionSummary(userId: $userId) {
      upcomingCourses {
        id
        title
        date
        instructor {
          id
          name
          avatar
        }
        status
      }
      recentCourses {
        id
        title
        date
        instructor {
          id
          name
          avatar
        }
        status
      }
      learningProgress {
        completedCourses
        totalCourses
        completedLessons
        totalLessons
      }
      evaluations {
        completed
        upcoming
        averageScore
      }
      eLearningCourses {
        id
        title
        category
        progress
        completedLessons
        totalLessons
        lastAccessedDate
      }
    }
  }
`