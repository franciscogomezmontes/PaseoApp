export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asistencia_comidas: {
        Row: {
          asiste: boolean
          fecha: string
          id: string
          momento_comida_id: string | null
          participacion_id: string
          tipo_comida: string
        }
        Insert: {
          asiste?: boolean
          fecha: string
          id?: string
          momento_comida_id?: string | null
          participacion_id: string
          tipo_comida: string
        }
        Update: {
          asiste?: boolean
          fecha?: string
          id?: string
          momento_comida_id?: string | null
          participacion_id?: string
          tipo_comida?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_comidas_momento_comida_id_fkey"
            columns: ["momento_comida_id"]
            isOneToOne: false
            referencedRelation: "momentos_comida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_comidas_participacion_id_fkey"
            columns: ["participacion_id"]
            isOneToOne: false
            referencedRelation: "participaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      directorio: {
        Row: {
          created_at: string | null
          email: string | null
          familia_nombre: string | null
          id: string
          nombre: string
          owner_id: string | null
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          familia_nombre?: string | null
          id?: string
          nombre: string
          owner_id?: string | null
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          familia_nombre?: string | null
          id?: string
          nombre?: string
          owner_id?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      familias: {
        Row: {
          created_at: string | null
          foto_url: string | null
          id: string
          nombre: string
          numero: number
          paseo_id: string | null
        }
        Insert: {
          created_at?: string | null
          foto_url?: string | null
          id?: string
          nombre: string
          numero: number
          paseo_id?: string | null
        }
        Update: {
          created_at?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          numero?: number
          paseo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "familias_paseo_id_fkey"
            columns: ["paseo_id"]
            isOneToOne: false
            referencedRelation: "paseos"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria: string | null
          created_at: string | null
          id: string
          monto: number
          nombre: string
          pagado_por: string | null
          paseo_id: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          monto: number
          nombre: string
          pagado_por?: string | null
          paseo_id?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          id?: string
          monto?: number
          nombre?: string
          pagado_por?: string | null
          paseo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_pagado_por_fkey"
            columns: ["pagado_por"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_paseo_id_fkey"
            columns: ["paseo_id"]
            isOneToOne: false
            referencedRelation: "paseos"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredientes: {
        Row: {
          categoria: string
          created_at: string | null
          id: string
          nombre: string
          observaciones: string | null
          recomendaciones: string | null
          unidad_base: string
        }
        Insert: {
          categoria: string
          created_at?: string | null
          id?: string
          nombre: string
          observaciones?: string | null
          recomendaciones?: string | null
          unidad_base: string
        }
        Update: {
          categoria?: string
          created_at?: string | null
          id?: string
          nombre?: string
          observaciones?: string | null
          recomendaciones?: string | null
          unidad_base?: string
        }
        Relationships: []
      }
      liquidaciones_pagadas: {
        Row: {
          created_at: string | null
          de_familia_id: string | null
          id: string
          monto: number
          pagado: boolean | null
          para_familia_id: string | null
          paseo_id: string | null
        }
        Insert: {
          created_at?: string | null
          de_familia_id?: string | null
          id?: string
          monto: number
          pagado?: boolean | null
          para_familia_id?: string | null
          paseo_id?: string | null
        }
        Update: {
          created_at?: string | null
          de_familia_id?: string | null
          id?: string
          monto?: number
          pagado?: boolean | null
          para_familia_id?: string | null
          paseo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_pagadas_paseo_id_fkey"
            columns: ["paseo_id"]
            isOneToOne: false
            referencedRelation: "paseos"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_mercado: {
        Row: {
          cantidad: number | null
          categoria: string | null
          comprado: boolean | null
          created_at: string | null
          es_extra: boolean | null
          id: string
          ingrediente_id: string | null
          nombre: string
          paseo_id: string
          recomendaciones: string | null
          unidad: string | null
        }
        Insert: {
          cantidad?: number | null
          categoria?: string | null
          comprado?: boolean | null
          created_at?: string | null
          es_extra?: boolean | null
          id?: string
          ingrediente_id?: string | null
          nombre: string
          paseo_id: string
          recomendaciones?: string | null
          unidad?: string | null
        }
        Update: {
          cantidad?: number | null
          categoria?: string | null
          comprado?: boolean | null
          created_at?: string | null
          es_extra?: boolean | null
          id?: string
          ingrediente_id?: string | null
          nombre?: string
          paseo_id?: string
          recomendaciones?: string | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_mercado_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_mercado_paseo_id_fkey"
            columns: ["paseo_id"]
            isOneToOne: false
            referencedRelation: "paseos"
            referencedColumns: ["id"]
          },
        ]
      }
      momentos_comida: {
        Row: {
          created_at: string | null
          fecha: string
          id: string
          paseo_id: string
          porciones: number | null
          receta_id: string | null
          tipo_comida: string
        }
        Insert: {
          created_at?: string | null
          fecha: string
          id?: string
          paseo_id: string
          porciones?: number | null
          receta_id?: string | null
          tipo_comida: string
        }
        Update: {
          created_at?: string | null
          fecha?: string
          id?: string
          paseo_id?: string
          porciones?: number | null
          receta_id?: string | null
          tipo_comida?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentos_comida_paseo_id_fkey"
            columns: ["paseo_id"]
            isOneToOne: false
            referencedRelation: "paseos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentos_comida_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      participaciones: {
        Row: {
          created_at: string | null
          factor: number
          familia_id: string | null
          fecha_desde: string | null
          fecha_hasta: string | null
          id: string
          paseo_id: string
          persona_id: string
          puso: number
          unidad_familiar: number
        }
        Insert: {
          created_at?: string | null
          factor?: number
          familia_id?: string | null
          fecha_desde?: string | null
          fecha_hasta?: string | null
          id?: string
          paseo_id: string
          persona_id: string
          puso?: number
          unidad_familiar?: number
        }
        Update: {
          created_at?: string | null
          factor?: number
          familia_id?: string | null
          fecha_desde?: string | null
          fecha_hasta?: string | null
          id?: string
          paseo_id?: string
          persona_id?: string
          puso?: number
          unidad_familiar?: number
        }
        Relationships: [
          {
            foreignKeyName: "participaciones_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_paseo_id_fkey"
            columns: ["paseo_id"]
            isOneToOne: false
            referencedRelation: "paseos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes_comida: {
        Row: {
          activo: boolean | null
          id: string
          momento_id: string | null
          participacion_id: string | null
        }
        Insert: {
          activo?: boolean | null
          id?: string
          momento_id?: string | null
          participacion_id?: string | null
        }
        Update: {
          activo?: boolean | null
          id?: string
          momento_id?: string | null
          participacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participantes_comida_momento_id_fkey"
            columns: ["momento_id"]
            isOneToOne: false
            referencedRelation: "momentos_comida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participantes_comida_participacion_id_fkey"
            columns: ["participacion_id"]
            isOneToOne: false
            referencedRelation: "participaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes_gasto: {
        Row: {
          activo: boolean | null
          gasto_id: string | null
          id: string
          participacion_id: string | null
        }
        Insert: {
          activo?: boolean | null
          gasto_id?: string | null
          id?: string
          participacion_id?: string | null
        }
        Update: {
          activo?: boolean | null
          gasto_id?: string | null
          id?: string
          participacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participantes_gasto_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participantes_gasto_participacion_id_fkey"
            columns: ["participacion_id"]
            isOneToOne: false
            referencedRelation: "participaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      paseos: {
        Row: {
          codigo_invitacion: string | null
          coordenadas_lat: number | null
          coordenadas_lng: number | null
          created_at: string | null
          estado: string
          fecha_fin: string
          fecha_inicio: string
          foto_url: string | null
          id: string
          link_alojamiento: string | null
          link_mapa: string | null
          lugar: string | null
          nombre: string
          organizer_id: string | null
          recomendaciones: string | null
        }
        Insert: {
          codigo_invitacion?: string | null
          coordenadas_lat?: number | null
          coordenadas_lng?: number | null
          created_at?: string | null
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          foto_url?: string | null
          id?: string
          link_alojamiento?: string | null
          link_mapa?: string | null
          lugar?: string | null
          nombre: string
          organizer_id?: string | null
          recomendaciones?: string | null
        }
        Update: {
          codigo_invitacion?: string | null
          coordenadas_lat?: number | null
          coordenadas_lng?: number | null
          created_at?: string | null
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          foto_url?: string | null
          id?: string
          link_alojamiento?: string | null
          link_mapa?: string | null
          lugar?: string | null
          nombre?: string
          organizer_id?: string | null
          recomendaciones?: string | null
        }
        Relationships: []
      }
      personas: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          foto_url: string | null
          id: string
          is_admin: boolean
          nombre: string
          restricciones_alimentarias: string | null
          sistema_unidades: string | null
          telefono: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          is_admin?: boolean
          nombre: string
          restricciones_alimentarias?: string | null
          sistema_unidades?: string | null
          telefono?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          is_admin?: boolean
          nombre?: string
          restricciones_alimentarias?: string | null
          sistema_unidades?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      receta_ingredientes: {
        Row: {
          cantidad_por_porcion: number
          id: string
          ingrediente_id: string
          receta_id: string
        }
        Insert: {
          cantidad_por_porcion: number
          id?: string
          ingrediente_id: string
          receta_id: string
        }
        Update: {
          cantidad_por_porcion?: number
          id?: string
          ingrediente_id?: string
          receta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receta_ingredientes_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_ingredientes_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      recetas: {
        Row: {
          categoria: string | null
          contiene_nueces: boolean | null
          creado_por: string | null
          created_at: string | null
          creditos: string | null
          descripcion: string | null
          es_picante: boolean | null
          es_publica: boolean | null
          es_vegano: boolean | null
          es_vegetariano: boolean | null
          foto_url: string | null
          id: string
          instrucciones: string | null
          nombre: string
          palabras_clave: string[] | null
          pasos_fotos: Json | null
          porciones_base: number
          receta_origen_id: string | null
          sin_gluten: boolean | null
          sin_lactosa: boolean | null
          tiempo_coccion: number | null
          tiempo_preparacion: number | null
          tipo_comida: string
          utensilios: string[] | null
        }
        Insert: {
          categoria?: string | null
          contiene_nueces?: boolean | null
          creado_por?: string | null
          created_at?: string | null
          creditos?: string | null
          descripcion?: string | null
          es_picante?: boolean | null
          es_publica?: boolean | null
          es_vegano?: boolean | null
          es_vegetariano?: boolean | null
          foto_url?: string | null
          id?: string
          instrucciones?: string | null
          nombre: string
          palabras_clave?: string[] | null
          pasos_fotos?: Json | null
          porciones_base?: number
          receta_origen_id?: string | null
          sin_gluten?: boolean | null
          sin_lactosa?: boolean | null
          tiempo_coccion?: number | null
          tiempo_preparacion?: number | null
          tipo_comida: string
          utensilios?: string[] | null
        }
        Update: {
          categoria?: string | null
          contiene_nueces?: boolean | null
          creado_por?: string | null
          created_at?: string | null
          creditos?: string | null
          descripcion?: string | null
          es_picante?: boolean | null
          es_publica?: boolean | null
          es_vegano?: boolean | null
          es_vegetariano?: boolean | null
          foto_url?: string | null
          id?: string
          instrucciones?: string | null
          nombre?: string
          palabras_clave?: string[] | null
          pasos_fotos?: Json | null
          porciones_base?: number
          receta_origen_id?: string | null
          sin_gluten?: boolean | null
          sin_lactosa?: boolean | null
          tiempo_coccion?: number | null
          tiempo_preparacion?: number | null
          tipo_comida?: string
          utensilios?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "recetas_receta_origen_id_fkey"
            columns: ["receta_origen_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      recetas_ocultas_por_usuario: {
        Row: {
          receta_id: string
          user_id: string
        }
        Insert: {
          receta_id: string
          user_id: string
        }
        Update: {
          receta_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recetas_ocultas_por_usuario_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_paseo_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
