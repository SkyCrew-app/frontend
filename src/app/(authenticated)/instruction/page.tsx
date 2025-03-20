"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  BookOpen,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  AlertCircle,
} from "lucide-react"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import gql from "graphql-tag"
import { motion } from "framer-motion"
import type { InstructionSummary } from "@/interfaces/instruction"
import { OverviewTab } from "@/components/learning-home/overview-tab"
import { CoursesTab } from "@/components/learning-home/courses-tab"
import { ELearningTab } from "@/components/learning-home/e-learning-tab"
import { Button } from "@/components/ui/button"
import { GET_USER_INSTRUCTION_SUMMARY } from "@/graphql/evaluation"

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

export default function InstructionHome() {
  const router = useRouter()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error } = useQuery(GET_USER_INSTRUCTION_SUMMARY, {
    variables: { userId },
    skip: !userId,
  })

  const summaryData: InstructionSummary = data?.getUserInstructionSummary || {
    upcomingCourses: [],
    recentCourses: [],
    learningProgress: {
      completedCourses: 0,
      totalCourses: 0,
      completedLessons: 0,
      totalLessons: 0,
    },
    evaluations: {
      completed: 0,
      upcoming: 0,
      averageScore: 0,
    },
    eLearningCourses: [],
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Chargement de vos données d'instruction...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors du chargement des données d'instruction.
            <br />
            {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              Centre d'Instruction
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos formations, cours et évaluations en un seul endroit
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/instruction/courses")} className="shadow-sm">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Mes</span> Cours
            </Button>
            <Button variant="outline" onClick={() => router.push("instruction/e-learning")} className="shadow-sm">
              <BookOpen className="mr-2 h-4 w-4" />
              E-Learning
            </Button>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-2">
          <TabsList className="flex md:grid md:grid-cols-3 p-1 shadow-md rounded-lg w-max md:w-[500px]">
            <TabsTrigger value="overview" className="flex items-center">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span className="truncate">Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center">
              <GraduationCap className="mr-2 h-4 w-4" />
              <span className="truncate">Cours</span>
            </TabsTrigger>
            <TabsTrigger value="e-learning" className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              <span className="truncate">E-Learning</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab data={summaryData} setActiveTab={setActiveTab} />
        </TabsContent>

        <TabsContent value="courses">
          <CoursesTab data={summaryData} />
        </TabsContent>

        <TabsContent value="e-learning">
          <ELearningTab data={summaryData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
