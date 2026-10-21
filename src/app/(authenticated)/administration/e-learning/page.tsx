"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("instruction")
  const [activeTab, setActiveTab] = useState("courses")
  // The course chosen on the Modules tab is still the one shown on the Lessons tab, and back.
  const [courseId, setCourseId] = useState("")

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("admin.title")}
        description={t("admin.description")}
        actions={
          <Button variant="outline" asChild>
            <Link href={learningRoutes.eLearning}>
              <Eye className="h-4 w-4" />
              {t("admin.viewCatalogue")}
            </Link>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="courses">{t("admin.tabs.courses")}</TabsTrigger>
          <TabsTrigger value="modules">{t("admin.tabs.modules")}</TabsTrigger>
          <TabsTrigger value="lessons">{t("admin.tabs.lessons")}</TabsTrigger>
          <TabsTrigger value="evaluations">{t("admin.tabs.evaluations")}</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <CourseManagement />
        </TabsContent>
        <TabsContent value="modules">
          <ModuleManagement courseId={courseId} onCourseChange={setCourseId} />
        </TabsContent>
        <TabsContent value="lessons">
          <LessonManagement courseId={courseId} onCourseChange={setCourseId} />
        </TabsContent>
        <TabsContent value="evaluations">
          <EvaluationManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
