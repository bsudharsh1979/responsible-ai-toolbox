// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  ICausalWhatIfData,
  ICausalAnalysisData,
  IErrorAnalysisMatrix,
  IHighchartBoxData,
  IHighchartBubbleSDKClusterData,
  ICounterfactualData,
  ILocalExplanations
} from "@responsible-ai/core-ui";
import {
  ModelAssessmentDashboard,
  IModelAssessmentData,
  IModelAssessmentDashboardProps,
  parseFeatureFlights
} from "@responsible-ai/model-assessment";
import React from "react";

import { callFlaskService } from "./callFlaskService";
import { IAppConfig } from "./config";

interface IModelAssessmentProps {
  config: IAppConfig;
  modelData: IModelAssessmentData;
}
export class ModelAssessment extends React.Component<IModelAssessmentProps> {
  public render(): React.ReactNode {
    const callBack: Pick<
      IModelAssessmentDashboardProps,
      | "requestExp"
      | "requestPredictions"
      | "requestDebugML"
      | "requestMatrix"
      | "requestImportances"
      | "requestCausalWhatIf"
      | "requestBoxPlotDistribution"
      | "requestDatasetAnalysisBarChart"
      | "requestDatasetAnalysisBoxChart"
      | "requestForecast"
      | "requestGlobalCausalEffects"
      | "requestGlobalCausalPolicy"
      | "requestGlobalExplanations"
      | "requestBubblePlotData"
      | "requestLocalCounterfactuals"
      | "requestLocalExplanations"
      | "requestMetrics"
    > = {};
    if (this.props.config.baseUrl) {
      callBack.requestExp = async (data: number): Promise<any[]> => {
        return callFlaskService(this.props.config, data, "/get_exp");
      };
      callBack.requestPredictions = async (data: any[]): Promise<any[]> => {
        return callFlaskService(this.props.config, data, "/predict");
      };
      callBack.requestMatrix = async (
        data: any[]
      ): Promise<IErrorAnalysisMatrix> => {
        return callFlaskService(this.props.config, data, "/matrix");
      };
      callBack.requestDebugML = async (data: any[]): Promise<any[]> => {
        return callFlaskService(this.props.config, data, "/tree");
      };
      callBack.requestImportances = async (data: any[]): Promise<any[]> => {
        return callFlaskService(this.props.config, data, "/importances");
      };
      callBack.requestCausalWhatIf = async (
        id: string,
        features: unknown[],
        featureName: string,
        newValue: unknown[],
        target: unknown[],
        abortSignal: AbortSignal
      ): Promise<ICausalWhatIfData[]> => {
        return callFlaskService(
          this.props.config,
          [id, features, featureName, newValue, target],
          "/causal_whatif",
          abortSignal
        );
      };
      callBack.requestBoxPlotDistribution = async (
        data: any
      ): Promise<IHighchartBoxData> => {
        return callFlaskService(
          this.props.config,
          data,
          "/model_overview_probability_distribution"
        );
      };
      callBack.requestForecast = async (data: any[]): Promise<any[]> => {
        return callFlaskService(this.props.config, data, "/forecast");
      };
      callBack.requestGlobalCausalEffects = async (
        id: string,
        filter: unknown[],
        compositeFilter: unknown[],
        abortSignal: AbortSignal
      ): Promise<ICausalAnalysisData> => {
        return callFlaskService(
          this.props.config,
          [id, filter, compositeFilter],
          "/global_causal_effects",
          abortSignal
        );
      };
      callBack.requestGlobalCausalPolicy = async (
        id: string,
        filter: unknown[],
        compositeFilter: unknown[],
        abortSignal: AbortSignal
      ): Promise<ICausalAnalysisData> => {
        return callFlaskService(
          this.props.config,
          [id, filter, compositeFilter],
          "/global_causal_policy",
          abortSignal
        );
      };
      callBack.requestGlobalExplanations = async (
        filter: unknown[],
        compositeFilter: unknown[],
        abortSignal: AbortSignal
      ): Promise<any> => {
        return callFlaskService(
          this.props.config,
          [filter, compositeFilter],
          "/global_explanations",
          abortSignal
        );
      };
      callBack.requestDatasetAnalysisBarChart = async (
        filter: unknown[],
        compositeFilter: unknown[],
        columnNameX: string,
        treatColumnXAsCategorical: boolean,
        columnNameY: string,
        treatColumnYAsCategorical: boolean,
        numBins: number,
        abortSignal: AbortSignal
      ): Promise<any> => {
        return callFlaskService(
          this.props.config,
          [
            filter,
            compositeFilter,
            columnNameX,
            treatColumnXAsCategorical,
            columnNameY,
            treatColumnYAsCategorical,
            numBins
          ],
          "/dataset_analysis_bar_chart_plot",
          abortSignal
        );
      };
      callBack.requestDatasetAnalysisBoxChart = async (
        filter: unknown[],
        compositeFilter: unknown[],
        columnNameX: string,
        columnNameY: string,
        numBins: number,
        abortSignal: AbortSignal
      ): Promise<any> => {
        return callFlaskService(
          this.props.config,
          [filter, compositeFilter, columnNameX, columnNameY, numBins],
          "/dataset_analysis_box_chart_plot",
          abortSignal
        );
      };
      callBack.requestBubblePlotData = async (
        filter: unknown[],
        compositeFilter: unknown[],
        xAxis: string,
        yAxis: string,
        abortSignal: AbortSignal
      ): Promise<IHighchartBubbleSDKClusterData> => {
        return callFlaskService(
          this.props.config,
          [filter, compositeFilter, xAxis, yAxis],
          "/dataset_analysis_bubble_chart_plot",
          abortSignal
        );
      };
      callBack.requestLocalCounterfactuals = async (
        counterfactualsId: string,
        absoluteIndex: number,
        abortSignal: AbortSignal
      ): Promise<ICounterfactualData> => {
        return callFlaskService(
          this.props.config,
          [counterfactualsId, absoluteIndex],
          "/local_counterfactuals",
          abortSignal
        );
      };
      callBack.requestLocalExplanations = async (
        absoluteIndex: number,
        abortSignal: AbortSignal
      ): Promise<ILocalExplanations> => {
        return callFlaskService(
          this.props.config,
          [absoluteIndex],
          "/local_explanations",
          abortSignal
        );
      };
      callBack.requestMetrics = async (
        filter: unknown[],
        compositeFilter: unknown[],
        metric: string,
        abortSignal: AbortSignal
      ): Promise<any> => {
        return callFlaskService(
          this.props.config,
          [filter, compositeFilter, metric],
          "/model_overview_metrics",
          abortSignal
        );
      };
    }

    return (
      <ModelAssessmentDashboard
        {...this.props.modelData}
        {...callBack}
        localUrl={this.props.config.baseUrl}
        locale={this.props.config.locale}
        theme={undefined}
        featureFlights={parseFeatureFlights(this.props.config.featureFlights)}
      />
    );
  }
}
