import type { AcademicDomain } from "@prisma/client"

export const ACADEMIC_DOMAIN_LABELS: Record<AcademicDomain, string> = {
  SCIENCE_TECHNOLOGY: "Science and Technology",
  SOCIAL_HUMANITIES: "Social Sciences and Humanities",
  LANGUAGE_COMMUNICATION: "Language and Communication",
  ARTS_CREATIVITY: "Arts and Creativity",
  PHYSICAL_EDUCATION: "Physical Education",
  SPIRITUALITY_ETHICS: "Spirituality and Ethics",
}

export const ACADEMIC_DOMAIN_SHORT_LABELS: Record<AcademicDomain, string> = {
  SCIENCE_TECHNOLOGY: "Science & Tech",
  SOCIAL_HUMANITIES: "Social Studies",
  LANGUAGE_COMMUNICATION: "Language",
  ARTS_CREATIVITY: "Arts",
  PHYSICAL_EDUCATION: "Physical Ed",
  SPIRITUALITY_ETHICS: "Ethics",
}

export const ACADEMIC_DOMAIN_DESCRIPTIONS: Record<AcademicDomain, string> = {
  SCIENCE_TECHNOLOGY: "Logic, data analysis, and technical problem-solving.",
  SOCIAL_HUMANITIES: "Social understanding, narrative thinking, and empathy.",
  LANGUAGE_COMMUNICATION: "Articulation, literacy, and expression of ideas.",
  ARTS_CREATIVITY: "Imagination, creativity, and creative practice.",
  PHYSICAL_EDUCATION: "Physical coordination, endurance, and sportsmanship.",
  SPIRITUALITY_ETHICS: "Ethical reasoning, values, and personal development.",
}

export const ACADEMIC_DOMAIN_ORDER = Object.keys(ACADEMIC_DOMAIN_LABELS) as AcademicDomain[]
