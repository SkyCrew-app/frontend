"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseManagement } from "@/components/e-learning/CourseManagement"
import { ModuleManagement } from "@/components/e-learning/ModuleManagement"
import { LessonManagement } from "@/components/e-learning/LessonManagement"
import { EvaluationManagement } from "@/components/evaluation/EvaluationManagement"
import { BookOpen, Layers, FileText, ClipboardList, Sparkles, BarChart3 } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default function AdminELearningPage() {
  const [activeTab, setActiveTab] = useState("courses")
  const [mounted, setMounted] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Éviter les erreurs d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                Administration E-Learning
              </h1>
              <p className="text-muted-foreground mt-1">
                Gérez les cours, modules, leçons et évaluations de la plateforme d'apprentissage
              </p>
            </div>
          </div>

          <Card className="border-t-4 border-t-blue-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Tableau de bord</CardTitle>
              <CardDescription>Gérez tous les aspects de votre plateforme e-learning</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <div className="overflow-x-auto pb-2">
                  <TabsList className="w-full md:w-auto flex md:inline-flex space-x-1">
                    <TabsTrigger
                      value="courses"
                      className="flex items-center whitespace-nowrap"
                      data-active={activeTab === "courses"}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      <span>Cours</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="modules"
                      className="flex items-center whitespace-nowrap"
                      data-active={activeTab === "modules"}
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      <span>Modules</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="lessons"
                      className="flex items-center whitespace-nowrap"
                      data-active={activeTab === "lessons"}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      <span>Leçons</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="evaluations"
                      className="flex items-center whitespace-nowrap"
                      data-active={activeTab === "evaluations"}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      <span>Évaluations</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <Separator className="my-2" />

                <TabsContent value="courses" className="space-y-8 mt-6 focus-visible:outline-none focus-visible:ring-0">
                  <CourseManagement />
                </TabsContent>

                <TabsContent value="modules" className="space-y-8 mt-6 focus-visible:outline-none focus-visible:ring-0">
                  <ModuleManagement />
                </TabsContent>

                <TabsContent value="lessons" className="space-y-8 mt-6 focus-visible:outline-none focus-visible:ring-0">
                  <LessonManagement />
                </TabsContent>

                <TabsContent
                  value="evaluations"
                  className="space-y-8 mt-6 focus-visible:outline-none focus-visible:ring-0"
                >
                  <EvaluationManagement />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
