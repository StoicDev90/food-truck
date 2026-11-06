
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categorias": {
                  Row: {
                    "created_at": string,"id": string,"nombre": string,"orden": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nombre": string,"orden"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nombre"?: string,"orden"?: number
                  }
                  Relationships: [
                    
                  ]
                },"configuracion": {
                  Row: {
                    "horarios": NonNullable<Json>,"id": number,"instagram": string | null,"logo_path": string | null,"nombre": string,"ubicacion": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "horarios"?: NonNullable<Json>,"id"?: number,"instagram"?: string | null,"logo_path"?: string | null,"nombre"?: string,"ubicacion"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "horarios"?: NonNullable<Json>,"id"?: number,"instagram"?: string | null,"logo_path"?: string | null,"nombre"?: string,"ubicacion"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"correcciones_conteo": {
                  Row: {
                    "contado_brl_anterior": number | null,"contado_brl_nuevo": number | null,"contado_gs_anterior": number | null,"contado_gs_nuevo": number | null,"created_at": string,"dueno_id": string,"id": string,"motivo": string,"turno_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contado_brl_anterior"?: number | null,"contado_brl_nuevo"?: number | null,"contado_gs_anterior"?: number | null,"contado_gs_nuevo"?: number | null,"created_at"?: string,"dueno_id": string,"id"?: string,"motivo": string,"turno_id": string
                  }
                  Update: {
                    "contado_brl_anterior"?: number | null,"contado_brl_nuevo"?: number | null,"contado_gs_anterior"?: number | null,"contado_gs_nuevo"?: number | null,"created_at"?: string,"dueno_id"?: string,"id"?: string,"motivo"?: string,"turno_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "correcciones_conteo_dueno_id_fkey"
      columns: ["dueno_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correcciones_conteo_turno_id_fkey"
      columns: ["turno_id"]
isOneToOne: false
      referencedRelation: "turnos"
      referencedColumns: ["id"]
    }
                  ]
                },"cotizaciones": {
                  Row: {
                    "actualizado_por": string | null,"fecha": string,"fuente": string | null,"updated_at": string,"valor_api": number | null,"valor_manual": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_por"?: string | null,"fecha": string,"fuente"?: string | null,"updated_at"?: string,"valor_api"?: number | null,"valor_manual"?: number | null
                  }
                  Update: {
                    "actualizado_por"?: string | null,"fecha"?: string,"fuente"?: string | null,"updated_at"?: string,"valor_api"?: number | null,"valor_manual"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cotizaciones_actualizado_por_fkey"
      columns: ["actualizado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos_caja": {
                  Row: {
                    "created_at": string,"id": string,"moneda": Database["public"]['Enums']["moneda"],"monto": number,"motivo": string,"sentido": Database["public"]['Enums']["sentido_caja"],"tipo": Database["public"]['Enums']["tipo_mov_caja"],"turno_id": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"moneda": Database["public"]['Enums']["moneda"],"monto": number,"motivo": string,"sentido": Database["public"]['Enums']["sentido_caja"],"tipo": Database["public"]['Enums']["tipo_mov_caja"],"turno_id": string,"usuario_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"moneda"?: Database["public"]['Enums']["moneda"],"monto"?: number,"motivo"?: string,"sentido"?: Database["public"]['Enums']["sentido_caja"],"tipo"?: Database["public"]['Enums']["tipo_mov_caja"],"turno_id"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_caja_turno_id_fkey"
      columns: ["turno_id"]
isOneToOne: false
      referencedRelation: "turnos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_caja_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos_stock": {
                  Row: {
                    "cantidad": number,"created_at": string,"id": string,"motivo": string | null,"producto_id": string,"tipo": Database["public"]['Enums']["tipo_mov_stock"],"turno_id": string | null,"usuario_id": string,"venta_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"created_at"?: string,"id"?: string,"motivo"?: string | null,"producto_id": string,"tipo": Database["public"]['Enums']["tipo_mov_stock"],"turno_id"?: string | null,"usuario_id": string,"venta_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"created_at"?: string,"id"?: string,"motivo"?: string | null,"producto_id"?: string,"tipo"?: Database["public"]['Enums']["tipo_mov_stock"],"turno_id"?: string | null,"usuario_id"?: string,"venta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_stock_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_turno_id_fkey"
      columns: ["turno_id"]
isOneToOne: false
      referencedRelation: "turnos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"pagos": {
                  Row: {
                    "cotizacion": number | null,"created_at": string,"equivalente_gs": number,"id": string,"medio": Database["public"]['Enums']["medio_pago"],"moneda": Database["public"]['Enums']["moneda"],"monto_recibido": number,"venta_id": string,"vuelto_gs": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cotizacion"?: number | null,"created_at"?: string,"equivalente_gs": number,"id"?: string,"medio": Database["public"]['Enums']["medio_pago"],"moneda": Database["public"]['Enums']["moneda"],"monto_recibido": number,"venta_id": string,"vuelto_gs"?: number
                  }
                  Update: {
                    "cotizacion"?: number | null,"created_at"?: string,"equivalente_gs"?: number,"id"?: string,"medio"?: Database["public"]['Enums']["medio_pago"],"moneda"?: Database["public"]['Enums']["moneda"],"monto_recibido"?: number,"venta_id"?: string,"vuelto_gs"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pagos_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: true
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"usuario": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"usuario"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"],"usuario"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"categoria_id": string,"controla_stock": boolean,"costo_gs": number | null,"created_at": string,"descripcion": string | null,"foto_path": string | null,"id": string,"nombre": string,"precio_gs": number,"stock": number,"visible": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"categoria_id": string,"controla_stock"?: boolean,"costo_gs"?: number | null,"created_at"?: string,"descripcion"?: string | null,"foto_path"?: string | null,"id"?: string,"nombre": string,"precio_gs": number,"stock"?: number,"visible"?: boolean
                  }
                  Update: {
                    "activo"?: boolean,"categoria_id"?: string,"controla_stock"?: boolean,"costo_gs"?: number | null,"created_at"?: string,"descripcion"?: string | null,"foto_path"?: string | null,"id"?: string,"nombre"?: string,"precio_gs"?: number,"stock"?: number,"visible"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    }
                  ]
                },"turnos": {
                  Row: {
                    "abierto_at": string,"cerrado_at": string | null,"cerrado_por": string | null,"contado_brl": number | null,"contado_gs": number | null,"created_at": string,"empleado_id": string,"fondo_brl": number,"fondo_gs": number,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abierto_at"?: string,"cerrado_at"?: string | null,"cerrado_por"?: string | null,"contado_brl"?: number | null,"contado_gs"?: number | null,"created_at"?: string,"empleado_id": string,"fondo_brl"?: number,"fondo_gs"?: number,"id"?: string
                  }
                  Update: {
                    "abierto_at"?: string,"cerrado_at"?: string | null,"cerrado_por"?: string | null,"contado_brl"?: number | null,"contado_gs"?: number | null,"created_at"?: string,"empleado_id"?: string,"fondo_brl"?: number,"fondo_gs"?: number,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "turnos_cerrado_por_fkey"
      columns: ["cerrado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "turnos_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"venta_items": {
                  Row: {
                    "cantidad": number,"costo_unitario_gs": number | null,"created_at": string,"id": string,"precio_unitario_gs": number,"producto_id": string,"venta_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"costo_unitario_gs"?: number | null,"created_at"?: string,"id"?: string,"precio_unitario_gs": number,"producto_id": string,"venta_id": string
                  }
                  Update: {
                    "cantidad"?: number,"costo_unitario_gs"?: number | null,"created_at"?: string,"id"?: string,"precio_unitario_gs"?: number,"producto_id"?: string,"venta_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venta_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venta_items_venta_id_fkey"
      columns: ["venta_id"]
isOneToOne: false
      referencedRelation: "ventas"
      referencedColumns: ["id"]
    }
                  ]
                },"ventas": {
                  Row: {
                    "anulada_at": string | null,"anulada_motivo": string | null,"anulada_por": string | null,"clave_idempotencia": string,"created_at": string,"empleado_id": string,"estado": Database["public"]['Enums']["estado_venta"],"id": string,"total_gs": number,"turno_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anulada_at"?: string | null,"anulada_motivo"?: string | null,"anulada_por"?: string | null,"clave_idempotencia": string,"created_at"?: string,"empleado_id": string,"estado"?: Database["public"]['Enums']["estado_venta"],"id"?: string,"total_gs": number,"turno_id": string
                  }
                  Update: {
                    "anulada_at"?: string | null,"anulada_motivo"?: string | null,"anulada_por"?: string | null,"clave_idempotencia"?: string,"created_at"?: string,"empleado_id"?: string,"estado"?: Database["public"]['Enums']["estado_venta"],"id"?: string,"total_gs"?: number,"turno_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ventas_anulada_por_fkey"
      columns: ["anulada_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ventas_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ventas_turno_id_fkey"
      columns: ["turno_id"]
isOneToOne: false
      referencedRelation: "turnos"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_aplicar_mov_stock":
{ Args: { "p_cantidad": number,"p_motivo": string,"p_producto_id": string,"p_tipo": Database["public"]['Enums']["tipo_mov_stock"],"p_venta_id": string }; Returns: number
                           },
"_probe_default_acl":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"_resumen_turno":
{ Args: { "p_turno_id": string }; Returns: Database["public"]['CompositeTypes']["resumen_caja"]
                          SetofOptions: {
        from: "*"
        to: "resumen_caja"
        isOneToOne: true
        isSetofReturn: false
      } },
"abrir_turno":
{ Args: { "p_fondo_brl": number,"p_fondo_gs": number }; Returns: string
                           },
"ajustar_stock":
{ Args: { "p_cantidad": number,"p_motivo": string,"p_producto_id": string }; Returns: number
                           },
"cerrar_turno":
{ Args: { "p_contado_brl": number,"p_contado_gs": number,"p_turno_id": string }; Returns: Database["public"]['CompositeTypes']["resumen_caja"]
                          SetofOptions: {
        from: "*"
        to: "resumen_caja"
        isOneToOne: true
        isSetofReturn: false
      } },
"corregir_conteo":
{ Args: { "p_contado_brl": number,"p_contado_gs": number,"p_motivo": string,"p_turno_id": string }; Returns: undefined
                           },
"costos_productos":
{ Args: Record<PropertyKey, never>; Returns: {
              "costo_gs": number,"producto_id": string
            }[]
                           },
"cotizacion_vigente":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"es_dueno":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"fecha_py":
{ Args: { "ts"?: string }; Returns: string
                           },
"fijar_cotizacion_manual":
{ Args: { "p_valor": number }; Returns: undefined
                           },
"fondo_sugerido":
{ Args: Record<PropertyKey, never>; Returns: {
              "fondo_brl": number,"fondo_gs": number
            }[]
                           },
"registrar_cotizacion_api":
{ Args: { "p_fecha": string,"p_fuente": string,"p_valor": number }; Returns: undefined
                           },
"registrar_ingreso_stock":
{ Args: { "p_cantidad": number,"p_motivo"?: string,"p_producto_id": string }; Returns: number
                           },
"registrar_movimiento_caja":
{ Args: { "p_moneda": Database["public"]['Enums']["moneda"],"p_monto": number,"p_motivo": string,"p_sentido": Database["public"]['Enums']["sentido_caja"],"p_tipo": Database["public"]['Enums']["tipo_mov_caja"] }; Returns: string
                           },
"resumen_turno":
{ Args: { "p_turno_id": string }; Returns: Database["public"]['CompositeTypes']["resumen_caja"]
                          SetofOptions: {
        from: "*"
        to: "resumen_caja"
        isOneToOne: true
        isSetofReturn: false
      } },
"rol_actual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol_usuario"]
                           },
"turno_actual":
{ Args: Record<PropertyKey, never>; Returns: {
              "abierto_at": string,"empleado_id": string,"empleado_nombre": string,"id": string
            }[]
                           }
          }
          Enums: {
            "estado_venta": "confirmada"|"anulada","medio_pago": "efectivo_gs"|"efectivo_brl"|"transferencia"|"tarjeta","moneda": "PYG"|"BRL","rol_usuario": "dueno"|"empleado","sentido_caja": "entrada"|"salida","tipo_mov_caja": "retiro"|"pago_proveedor"|"aporte_cambio"|"cambio_moneda"|"otro","tipo_mov_stock": "ingreso"|"venta"|"anulacion"|"ajuste"
          }
          CompositeTypes: {
            "resumen_caja": {
                        "esperado_gs": number | null,"esperado_brl": number | null,"contado_gs": number | null,"contado_brl": number | null,"diferencia_gs": number | null,"diferencia_brl": number | null,"transferencias_gs": number | null,"tarjetas_gs": number | null
                      }
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "estado_venta": ["confirmada", "anulada"],"medio_pago": ["efectivo_gs", "efectivo_brl", "transferencia", "tarjeta"],"moneda": ["PYG", "BRL"],"rol_usuario": ["dueno", "empleado"],"sentido_caja": ["entrada", "salida"],"tipo_mov_caja": ["retiro", "pago_proveedor", "aporte_cambio", "cambio_moneda", "otro"],"tipo_mov_stock": ["ingreso", "venta", "anulacion", "ajuste"]
          }
        }
} as const
