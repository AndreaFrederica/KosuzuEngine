export type Live2DProfile = {
  id: string;
  paramAliases: Record<string, string>;
};

export function autoProfileFromParamIds(paramIds: Set<string>): Live2DProfile {
  const alias: Record<string, string> = {};
  for (const id of paramIds) alias[id] = id;

  const pick = (...candidates: string[]) => {
    for (const c of candidates) {
      if (paramIds.has(c)) return c;
    }
    return undefined;
  };

  const map = (canonical: string, ...candidates: string[]) => {
    const found = pick(canonical, ...candidates);
    if (found) alias[canonical] = found;
  };

  map('ParamAngleX', 'PARAM_ANGLE_X', 'AngleX', 'angleX');
  map('ParamAngleY', 'PARAM_ANGLE_Y', 'AngleY', 'angleY');
  map('ParamAngleZ', 'PARAM_ANGLE_Z', 'AngleZ', 'angleZ');
  map('ParamBodyAngleX', 'PARAM_BODY_ANGLE_X', 'BodyAngleX', 'bodyAngleX');
  map('ParamBodyAngleY', 'PARAM_BODY_ANGLE_Y', 'BodyAngleY', 'bodyAngleY');
  map('ParamEyeBallX', 'PARAM_EYE_BALL_X', 'EyeBallX', 'eyeBallX', 'ParamEyeBallX');
  map('ParamEyeBallY', 'PARAM_EYE_BALL_Y', 'EyeBallY', 'eyeBallY', 'ParamEyeBallY');

  return { id: 'auto', paramAliases: alias };
}

export function applyProfileParams(params: Record<string, number>, profile: Live2DProfile, allowIds?: Set<string>) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== 'number') continue;
    const mapped = profile.paramAliases[k] ?? k;
    if (allowIds && allowIds.size > 0 && !allowIds.has(mapped)) continue;
    out[mapped] = v;
  }
  return out;
}
