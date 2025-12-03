class CucumberService {
    async generateTestClass(endpoint, projectConfig, testCases) {
        console.log(`[CucumberService] Generating Cucumber feature | Endpoint: ${endpoint.path}`);

        try {
            const featureFile = this.generateFeatureFile(endpoint, testCases);
            const stepDefinitions = this.generateStepDefinitions(endpoint, projectConfig);

            console.log(`[CucumberService] Cucumber test generated | Feature: ${featureFile.name}`);

            return {
                featureFile: featureFile,
                stepDefinitions: stepDefinitions
            };
        } catch (error) {
            console.error(`[CucumberService] Cucumber generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    generateFeatureFile(endpoint, testCases) {
        const featureName = this.generateFeatureName(endpoint);

        let scenarios = '';
        for (const testCase of testCases) {
            scenarios += this.generateScenario(endpoint, testCase);
        }

        const content = `Feature: ${featureName}
  As an API consumer
  I want to test ${endpoint.path}
  So that I can ensure API functionality

${scenarios}`;

        return {
            name: `${featureName.replace(/\s+/g, '')}.feature`,
            content: content
        };
    }

    generateFeatureName(endpoint) {
        const method = endpoint.method.toUpperCase();
        const pathName = endpoint.path.split('/').filter(p => p).join(' ');
        return `${method} ${pathName}`;
    }

    generateScenario(endpoint, testCase) {
        const scenarioName = testCase.name || `${testCase.type} test`;

        return `
  @${testCase.type} @${endpoint.method.toLowerCase()}
  Scenario: ${scenarioName}
    Given the API is available
    When I send a ${endpoint.method} request to "${endpoint.path}"
    Then the response status code should be ${this.getExpectedStatus(endpoint.method, testCase.type)}
    And the response time should be less than 3000 milliseconds
`;
    }

    getExpectedStatus(method, type) {
        if (type === 'negative') return 400;
        const codes = { 'GET': 200, 'POST': 201, 'PUT': 200, 'PATCH': 200, 'DELETE': 204 };
        return codes[method] || 200;
    }

    generateStepDefinitions(endpoint, projectConfig) {
        const className = `${this.generateClassName(endpoint)}Steps`;
        const packageName = projectConfig.packageName || 'com.imagefetch.steps';

        const content = `package ${packageName};

import io.cucumber.java.en.*;
import io.restassured.response.Response;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class ${className} {
    
    private Response response;
    private String baseUrl = "${projectConfig.baseUrl || 'http://localhost:8080'}";
    
    @Given("the API is available")
    public void theApiIsAvailable() {
        given().baseUri(baseUrl).get("/health").then().statusCode(200);
    }
    
    @When("I send a {string} request to {string}")
    public void iSendRequest(String method, String endpoint) {
        response = given()
            .baseUri(baseUrl)
            .contentType("application/json")
            .when()
            .request(method, endpoint);
    }
    
    @Then("the response status code should be {int}")
    public void verifyStatusCode(int expectedStatusCode) {
        response.then().statusCode(expectedStatusCode);
    }
    
    @Then("the response time should be less than {int} milliseconds")
    public void verifyResponseTime(long maxTime) {
        response.then().time(lessThan(maxTime));
    }
}`;

        return {
            name: `${className}.java`,
            packageName: packageName,
            content: content
        };
    }

    generateClassName(endpoint) {
        const pathParts = endpoint.path.split('/').filter(p => p && !p.startsWith(':'));
        return pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    }

    async generateTestSuite(testSuite, projectConfig) {
        console.log(`[CucumberService] Generating Cucumber test suite | Suite: ${testSuite.name}`);

        const runnerClass = `${testSuite.name.replace(/\s+/g, '')}Runner`;
        const packageName = projectConfig.packageName || 'com.imagefetch.runners';

        const content = `package ${packageName};

import io.cucumber.testng.AbstractTestNGCucumberTests;
import io.cucumber.testng.CucumberOptions;

@CucumberOptions(
    features = "src/test/resources/features",
    glue = "com.imagefetch.steps",
    plugin = {"pretty", "html:target/cucumber-reports/cucumber.html"},
    tags = "@smoke or @regression"
)
public class ${runnerClass} extends AbstractTestNGCucumberTests {
}`;

        return { content, className: runnerClass };
    }
}

module.exports = new CucumberService();