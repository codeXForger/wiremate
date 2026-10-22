import { MQTT_QOS_LEVELS, type MqttQos } from '@shared/types/protocol'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Field } from '../../request/components/Field'
import { OptionSelect } from '../../request/components/OptionSelect'
import { useConfigBinder } from '../../request/use-field-binder'
import type { EditorProps } from '../types'

const QOS_LABEL: Record<MqttQos, string> = {
  '0': '0 · At most once',
  '1': '1 · At least once',
  '2': '2 · Exactly once'
}

export function MqttOptions({ requestId }: EditorProps) {
  const qos = useConfigBinder<'mqtt', MqttQos>(requestId)('qos')
  return (
    <>
      <Field label="QoS" htmlFor={`${requestId}-qos`}>
        <OptionSelect label="QoS" options={MQTT_QOS_LEVELS} format={(level) => QOS_LABEL[level]} {...qos} />
      </Field>
      <RetainToggle requestId={requestId} />
    </>
  )
}

function RetainToggle({ requestId }: EditorProps) {
  const retain = useConfigBinder<'mqtt', boolean>(requestId)('retain')
  const id = `${requestId}-retain`
  return (
    <div className="flex items-end gap-2 pb-2">
      <Switch id={id} checked={retain.value} onCheckedChange={retain.onChange} />
      <Label htmlFor={id}>Retain message</Label>
    </div>
  )
}
