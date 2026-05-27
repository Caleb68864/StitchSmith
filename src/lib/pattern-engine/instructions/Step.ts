export interface Step {
  id: string;
  title: string;
  body: string;
  dependsOn: string[];
  refsPieces: string[];
  group?: string;
}
