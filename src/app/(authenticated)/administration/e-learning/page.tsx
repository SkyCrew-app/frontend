"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/layout/PageHeader"
import { CourseManagement } from "@/components/e-learning/CourseManagement"
import { ModuleManagement } from "@/components/e-learning/ModuleManagement"
import { LessonManagement } from "@/components/e-learning/LessonManagement"
import { EvaluationManagement } from "@/components/evaluation/EvaluationManagement"
import { learningRoutes } from "@/lib/learning-navigation"

export default function AdminELearningPage() {
  const [activeTab, setActiveTab] = useState("courses")

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="Gestion de l'e-learning"
        description="Un cours se compose de modules, un module de leçons et d'évaluations."
        actions={
          <Button variant="outline" asChild>
            <Link href={learningRoutes.eLearning}>
              <Eye className="h-4 w-4" />
              Voir le catalogue
            </Link>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="courses">Cours</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="lessons">Leçons</TabsTrigger>
          <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <CourseManagement />
        </TabsContent>
        <TabsContent value="modules">
          <ModuleManagement />
        </TabsContent>
        <TabsContent value="lessons">
          <LessonManagement />
        </TabsContent>
        <TabsContent value="evaluations">
          <EvaluationManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
